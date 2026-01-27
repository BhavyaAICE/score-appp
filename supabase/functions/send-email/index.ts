import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email template types
type TemplateId = 
  | "judge_invitation"
  | "scoring_reminder"
  | "event_status_change"
  | "results_published"
  | "security_alert";

interface EmailRequest {
  to: string | string[];
  templateId: TemplateId;
  // Template-specific variables
  eventName?: string;
  judgeName?: string;
  eventDate?: string;
  judgeLink?: string;
  completedCount?: number;
  totalCount?: number;
  oldStatus?: string;
  newStatus?: string;
  statusMessage?: string;
  eventLink?: string;
  resultsLink?: string;
  alertType?: string;
  timestamp?: string;
  description?: string;
  securityLink?: string;
  // For invitation template
  role?: string;
  eventNames?: string[];
  inviterName?: string;
  organizationName?: string;
  message?: string;
  invitationToken?: string;
  acceptUrl?: string;
}

const getFromEmail = () => {
  return Deno.env.get("FROM_EMAIL") || "FairScore <onboarding@resend.dev>";
};

const generateEmailContent = (templateId: TemplateId, data: EmailRequest): { subject: string; html: string } => {
  switch (templateId) {
    case "judge_invitation":
      return {
        subject: `You're invited to judge: ${data.eventName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">You're Invited to Judge!</h1>
              </div>
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px;">Hello ${data.judgeName || 'there'},</p>
                <p style="color: #374151; font-size: 16px;">You have been invited to be a judge for <strong>${data.eventName}</strong>.</p>
                ${data.eventDate ? `<p style="color: #374151;"><strong>Date:</strong> ${data.eventDate}</p>` : ''}
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${data.judgeLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 700;">Access Dashboard</a>
                </div>
                <p style="color: #9ca3af; font-size: 13px; text-align: center;">This link is unique to you. Do not share it with others.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case "scoring_reminder":
      return {
        subject: `Reminder: Complete your scoring for ${data.eventName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏰ Scoring Reminder</h1>
              </div>
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px;">Hello ${data.judgeName || 'there'},</p>
                <p style="color: #374151; font-size: 16px;">This is a friendly reminder that you have pending evaluations for <strong>${data.eventName}</strong>.</p>
                <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                  <p style="color: #92400e; font-size: 24px; font-weight: 700; margin: 0;">${data.completedCount || 0}/${data.totalCount || 0}</p>
                  <p style="color: #92400e; font-size: 14px; margin: 8px 0 0;">teams scored</p>
                </div>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${data.judgeLink}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 700;">Continue Scoring</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case "event_status_change":
      return {
        subject: `Event Update: ${data.eventName} is now ${data.newStatus}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Event Status Updated</h1>
              </div>
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px;">The event <strong>${data.eventName}</strong> has changed status.</p>
                <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin: 24px 0;">
                  <p style="color: #1e40af; margin: 0;"><strong>Previous:</strong> ${data.oldStatus}</p>
                  <p style="color: #1e40af; margin: 8px 0 0;"><strong>New:</strong> ${data.newStatus}</p>
                </div>
                ${data.statusMessage ? `<p style="color: #374151;">${data.statusMessage}</p>` : ''}
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${data.eventLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 700;">View Event</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case "results_published":
      return {
        subject: `🏆 Results Published: ${data.eventName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🏆 Results Are Live!</h1>
              </div>
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px;">The results for <strong>${data.eventName}</strong> have been published.</p>
                <p style="color: #374151; font-size: 16px;">Click below to view the final rankings and scores:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${data.resultsLink}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 700;">View Results</a>
                </div>
                <p style="color: #9ca3af; font-size: 13px; text-align: center;">Thank you for participating!</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

    case "security_alert":
      return {
        subject: `🔒 Security Alert: ${data.alertType}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔒 Security Alert</h1>
              </div>
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px;">We detected unusual activity on your FairScore account:</p>
                <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #dc2626;">
                  <p style="color: #991b1b; margin: 0;"><strong>Alert Type:</strong> ${data.alertType}</p>
                  <p style="color: #991b1b; margin: 8px 0 0;"><strong>Time:</strong> ${data.timestamp}</p>
                  <p style="color: #991b1b; margin: 8px 0 0;"><strong>Details:</strong> ${data.description}</p>
                </div>
                <p style="color: #374151;">If this wasn't you, please secure your account immediately:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${data.securityLink}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 700;">Secure Account</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

    default:
      return {
        subject: "Notification from FairScore",
        html: `<p>You have a new notification from FairScore.</p>`
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EmailRequest = await req.json();

    console.log(`Sending ${requestData.templateId} email to ${requestData.to}`);

    const { subject, html } = generateEmailContent(requestData.templateId, requestData);

    const toAddresses = Array.isArray(requestData.to) ? requestData.to : [requestData.to];

    const emailResponse = await resend.emails.send({
      from: getFromEmail(),
      to: toAddresses,
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
