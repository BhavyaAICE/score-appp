/**
 * Email Notification Service
 * Handles email notifications for event lifecycle changes
 * 
 * Note: This service integrates with Supabase Edge Functions or external email providers
 * For production, configure with SendGrid, Mailgun, or similar
 */

import { supabase } from '../supabaseClient';

export const EmailTemplates = {
  JUDGE_INVITATION: 'judge_invitation',
  EVENT_STATUS_CHANGE: 'event_status_change',
  SCORING_REMINDER: 'scoring_reminder',
  RESULTS_PUBLISHED: 'results_published',
  ACCOUNT_CREATED: 'account_created',
  PASSWORD_RESET: 'password_reset',
  SECURITY_ALERT: 'security_alert'
};

const templates = {
  [EmailTemplates.JUDGE_INVITATION]: {
    subject: 'You\'ve Been Invited to Judge: {{eventName}}',
    body: `
      <h2>Hello {{judgeName}},</h2>
      <p>You have been invited to be a judge for <strong>{{eventName}}</strong>.</p>
      <p><strong>Event Details:</strong></p>
      <ul>
        <li>Event: {{eventName}}</li>
        <li>Date: {{eventDate}}</li>
        <li>Your Role: Judge</li>
      </ul>
      <p>Click the button below to access your judging dashboard:</p>
      <a href="{{judgeLink}}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Access Dashboard</a>
      <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
        This link is unique to you. Do not share it with others.
      </p>
    `
  },
  [EmailTemplates.EVENT_STATUS_CHANGE]: {
    subject: 'Event Status Update: {{eventName}} is now {{newStatus}}',
    body: `
      <h2>Event Status Updated</h2>
      <p>The event <strong>{{eventName}}</strong> has changed status.</p>
      <p><strong>Previous Status:</strong> {{oldStatus}}</p>
      <p><strong>New Status:</strong> {{newStatus}}</p>
      <p>{{statusMessage}}</p>
      <a href="{{eventLink}}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">View Event</a>
    `
  },
  [EmailTemplates.SCORING_REMINDER]: {
    subject: 'Reminder: Complete Your Scoring for {{eventName}}',
    body: `
      <h2>Scoring Reminder</h2>
      <p>Hello {{judgeName}},</p>
      <p>This is a friendly reminder that you have pending evaluations for <strong>{{eventName}}</strong>.</p>
      <p><strong>Progress:</strong> {{completedCount}}/{{totalCount}} teams scored</p>
      <p>Please complete your evaluations before the deadline.</p>
      <a href="{{judgeLink}}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Continue Scoring</a>
    `
  },
  [EmailTemplates.RESULTS_PUBLISHED]: {
    subject: 'Results Published: {{eventName}}',
    body: `
      <h2>Results Are Now Available!</h2>
      <p>The results for <strong>{{eventName}}</strong> have been published.</p>
      <p>Click below to view the final rankings and scores:</p>
      <a href="{{resultsLink}}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">View Results</a>
      <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
        Thank you for participating in {{eventName}}!
      </p>
    `
  },
  [EmailTemplates.SECURITY_ALERT]: {
    subject: 'Security Alert: {{alertType}}',
    body: `
      <h2 style="color: #dc2626;">Security Alert</h2>
      <p>We detected unusual activity on your FairScore account:</p>
      <p><strong>Alert Type:</strong> {{alertType}}</p>
      <p><strong>Time:</strong> {{timestamp}}</p>
      <p><strong>Details:</strong> {{description}}</p>
      <p>If this wasn't you, please secure your account immediately:</p>
      <a href="{{securityLink}}" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px;">Secure Account</a>
    `
  }
};

export const emailService = {
  renderTemplate(templateId, variables) {
    const template = templates[templateId];
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let subject = template.subject;
    let body = template.body;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    return { subject, body };
  },

  async sendEmail(to, templateId, variables) {
    const { subject, body } = this.renderTemplate(templateId, variables);

    console.log(`[Email] Would send to ${to}:`, { subject, templateId });

    try {
      const { data, error } = await supabase
        .from('email_queue')
        .insert([{
          to_email: to,
          subject,
          body_html: body,
          template_id: templateId,
          variables,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '42P01') {
          console.log('[Email] Queue table not created yet, email logged only');
          return { success: true, queued: false };
        }
        throw error;
      }

      return { success: true, queued: true, id: data.id };
    } catch (err) {
      console.error('[Email] Error queuing email:', err);
      return { success: false, error: err.message };
    }
  },

  async sendBulkEmails(recipients, templateId, variablesMapper) {
    const results = [];
    
    for (const recipient of recipients) {
      const variables = variablesMapper(recipient);
      const result = await this.sendEmail(recipient.email, templateId, variables);
      results.push({ email: recipient.email, ...result });
    }

    return results;
  },

  async notifyJudges(eventId, eventName, judges) {
    const baseUrl = window.location.origin;
    
    return this.sendBulkEmails(
      judges,
      EmailTemplates.JUDGE_INVITATION,
      (judge) => ({
        judgeName: judge.name || judge.email,
        eventName,
        eventDate: new Date().toLocaleDateString(),
        judgeLink: `${baseUrl}/judge-dashboard?token=${judge.token}`
      })
    );
  },

  async notifyEventStatusChange(event, oldStatus, newStatus, recipients) {
    const baseUrl = window.location.origin;
    
    const statusMessages = {
      'live_judging': 'Judging is now open. Judges can begin submitting their evaluations.',
      'locked': 'Judging has ended. Results are being computed and reviewed.',
      'published': 'Results have been published and are now publicly available.'
    };

    return this.sendBulkEmails(
      recipients,
      EmailTemplates.EVENT_STATUS_CHANGE,
      (recipient) => ({
        eventName: event.name,
        oldStatus: oldStatus.replace('_', ' ').toUpperCase(),
        newStatus: newStatus.replace('_', ' ').toUpperCase(),
        statusMessage: statusMessages[newStatus] || '',
        eventLink: `${baseUrl}/admin/event/${event.id}`
      })
    );
  },

  async sendScoringReminder(judge, event, progress) {
    const baseUrl = window.location.origin;
    
    return this.sendEmail(
      judge.email,
      EmailTemplates.SCORING_REMINDER,
      {
        judgeName: judge.name || judge.email,
        eventName: event.name,
        completedCount: progress.completed,
        totalCount: progress.total,
        judgeLink: `${baseUrl}/judge-dashboard?token=${judge.token}`
      }
    );
  },

  async notifyResultsPublished(event, participants) {
    const baseUrl = window.location.origin;
    
    return this.sendBulkEmails(
      participants,
      EmailTemplates.RESULTS_PUBLISHED,
      (participant) => ({
        eventName: event.name,
        resultsLink: `${baseUrl}/results?event=${event.id}`
      })
    );
  }
};

export default emailService;
