/**
 * Event Lifecycle Service
 * Manages event states: Draft → Live Judging → Locked → Published
 * 
 * Enforces:
 * - Immutability after locking
 * - State transition validation
 * - Automatic notifications on state change
 */

import { supabase } from '../supabaseClient';
import { rbacService, Resources, Actions } from './rbacService';

export const EventStatus = {
  DRAFT: 'draft',
  LIVE_JUDGING: 'live_judging',
  LOCKED: 'locked',
  PUBLISHED: 'published'
};

const VALID_TRANSITIONS = {
  [EventStatus.DRAFT]: [EventStatus.LIVE_JUDGING],
  [EventStatus.LIVE_JUDGING]: [EventStatus.LOCKED],
  [EventStatus.LOCKED]: [EventStatus.PUBLISHED],
  [EventStatus.PUBLISHED]: []
};

export const eventLifecycleService = {
  async getEventWithStatus(eventId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data;
  },

  async canTransition(eventId, newStatus, userId) {
    const event = await this.getEventWithStatus(eventId);
    if (!event) {
      return { allowed: false, reason: 'Event not found' };
    }

    const currentStatus = event.status || EventStatus.DRAFT;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return {
        allowed: false,
        reason: `Cannot transition from ${currentStatus} to ${newStatus}`
      };
    }

    if (newStatus === EventStatus.LOCKED || newStatus === EventStatus.PUBLISHED) {
      const canLock = await rbacService.hasPermission(userId, Resources.EVENTS, Actions.LOCK);
      if (!canLock) {
        return { allowed: false, reason: 'Permission denied: Cannot lock events' };
      }
    }

    if (newStatus === EventStatus.PUBLISHED) {
      const canPublish = await rbacService.hasPermission(userId, Resources.EVENTS, Actions.PUBLISH);
      if (!canPublish) {
        return { allowed: false, reason: 'Permission denied: Cannot publish events' };
      }
    }

    if (newStatus === EventStatus.LIVE_JUDGING) {
      const readiness = await this.checkEventReadiness(eventId);
      if (!readiness.ready) {
        return { allowed: false, reason: readiness.issues.join(', ') };
      }
    }

    if (newStatus === EventStatus.LOCKED) {
      const scoringComplete = await this.checkScoringComplete(eventId);
      if (!scoringComplete.complete) {
        return { allowed: false, reason: scoringComplete.issues.join(', ') };
      }
    }

    return { allowed: true };
  },

  async transitionEvent(eventId, newStatus, userId, reason = null) {
    try {
      const { data, error } = await supabase
        .rpc('transition_event_status', {
          p_event_id: eventId,
          p_new_status: newStatus,
          p_reason: reason
        });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to transition event');
      }

      return data.event;
    } catch (err) {
      if (err.message?.includes('42883')) {
        const canTransitionResult = await this.canTransition(eventId, newStatus, userId);
        if (!canTransitionResult.allowed) {
          throw new Error(canTransitionResult.reason);
        }

        const event = await this.getEventWithStatus(eventId);
        const oldStatus = event.status || EventStatus.DRAFT;

        const updates = {
          status: newStatus,
          updated_at: new Date().toISOString()
        };

        if (newStatus === EventStatus.LOCKED) {
          updates.locked_at = new Date().toISOString();
          updates.locked_by = userId;
        }

        if (newStatus === EventStatus.PUBLISHED) {
          updates.published_at = new Date().toISOString();
          updates.published_by = userId;
        }

        const { data, error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', eventId)
          .select()
          .single();

        if (error) throw error;

        await rbacService.createAuditLog(
          userId,
          'status_change',
          'events',
          eventId,
          { status: oldStatus },
          { status: newStatus },
          reason
        );

        return data;
      }
      throw err;
    }
  },

  async checkEventReadiness(eventId) {
    const issues = [];

    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!event) {
      return { ready: false, issues: ['Event not found'] };
    }

    const { data: rounds } = await supabase
      .from('rounds')
      .select('id')
      .eq('event_id', eventId);

    if (!rounds || rounds.length === 0) {
      issues.push('No rounds defined');
    } else {
      for (const round of rounds) {
        const { data: criteria } = await supabase
          .from('round_criteria')
          .select('id')
          .eq('round_id', round.id);

        if (!criteria || criteria.length === 0) {
          issues.push(`Round ${round.id} has no criteria`);
        }

        const { data: judges } = await supabase
          .from('round_judge_assignments')
          .select('id')
          .eq('round_id', round.id);

        if (!judges || judges.length === 0) {
          issues.push(`Round ${round.id} has no judges assigned`);
        }
      }
    }

    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('event_id', eventId);

    if (!teams || teams.length === 0) {
      issues.push('No teams registered');
    }

    return {
      ready: issues.length === 0,
      issues
    };
  },

  async checkScoringComplete(eventId) {
    const issues = [];

    const { data: rounds } = await supabase
      .from('rounds')
      .select('id, round_number')
      .eq('event_id', eventId)
      .order('round_number');

    if (!rounds || rounds.length === 0) {
      return { complete: false, issues: ['No rounds found'] };
    }

    for (const round of rounds) {
      const { data: assignments } = await supabase
        .from('round_judge_assignments')
        .select('judge_id')
        .eq('round_id', round.id);

      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('event_id', eventId);

      if (assignments && teams) {
        const { data: evaluations } = await supabase
          .from('round_evaluations')
          .select('judge_id, team_id')
          .eq('round_id', round.id)
          .eq('is_draft', false);

        const expectedCount = assignments.length * teams.length;
        const actualCount = evaluations?.length || 0;

        if (actualCount < expectedCount) {
          issues.push(`Round ${round.round_number}: ${actualCount}/${expectedCount} evaluations complete`);
        }
      }

      const { data: results } = await supabase
        .from('round_normalization_results')
        .select('id')
        .eq('round_id', round.id)
        .limit(1);

      if (!results || results.length === 0) {
        issues.push(`Round ${round.round_number}: Results not computed`);
      }
    }

    return {
      complete: issues.length === 0,
      issues
    };
  },

  async getEventStatusDisplay(status) {
    const displays = {
      [EventStatus.DRAFT]: {
        label: 'Draft',
        color: 'gray',
        icon: 'draft',
        description: 'Event is being set up'
      },
      [EventStatus.LIVE_JUDGING]: {
        label: 'Live Judging',
        color: 'green',
        icon: 'live',
        description: 'Judges are actively scoring'
      },
      [EventStatus.LOCKED]: {
        label: 'Locked',
        color: 'orange',
        icon: 'lock',
        description: 'Scoring complete, results being reviewed'
      },
      [EventStatus.PUBLISHED]: {
        label: 'Published',
        color: 'blue',
        icon: 'public',
        description: 'Results are publicly visible'
      }
    };

    return displays[status] || displays[EventStatus.DRAFT];
  },

  async isEventModifiable(eventId) {
    const event = await this.getEventWithStatus(eventId);
    if (!event) return false;
    
    const status = event.status || EventStatus.DRAFT;
    return status === EventStatus.DRAFT || status === EventStatus.LIVE_JUDGING;
  },

  async canSubmitScores(eventId) {
    const event = await this.getEventWithStatus(eventId);
    if (!event) return false;
    
    return event.status === EventStatus.LIVE_JUDGING;
  },

  async getEventState(eventId) {
    try {
      const { data, error } = await supabase
        .rpc('get_event_state', { p_event_id: eventId });

      if (error) throw error;
      return data;
    } catch (err) {
      const event = await this.getEventWithStatus(eventId);
      return {
        id: event.id,
        name: event.name,
        status: event.status,
        locked_at: event.locked_at,
        published_at: event.published_at,
        can_modify: !['locked', 'published'].includes(event.status),
        can_submit_scores: event.status === 'live_judging',
        can_compute_results: ['live_judging', 'locked'].includes(event.status),
        can_publish: event.status === 'locked'
      };
    }
  },

  async getStateTransitionHistory(eventId) {
    const { data, error } = await supabase
      .from('event_state_transitions')
      .select('*, user_profiles(email, full_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('State transitions table may not exist:', error);
      return [];
    }
    return data || [];
  },

  async getPendingNotifications(eventId) {
    const { data, error } = await supabase
      .from('event_notifications')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Notifications table may not exist:', error);
      return [];
    }
    return data || [];
  },

  subscribeToEventStatus(eventId, callback) {
    const channel = supabase
      .channel(`event-status-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};

export default eventLifecycleService;
