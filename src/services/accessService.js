/**
 * Access Service
 * Handles granting, revoking, and managing event access
 * Includes audit logging for all access changes
 */

import { supabase } from '../supabaseClient';
import { auditService, AuditActions } from './auditService';

export const AccessActions = {
  GRANT: 'access_grant',
  REVOKE: 'access_revoke',
  UPDATE: 'access_update',
  INVITATION_CREATE: 'invitation_create',
  INVITATION_ACCEPT: 'invitation_accept',
  INVITATION_CANCEL: 'invitation_cancel',
  INVITATION_RESEND: 'invitation_resend'
};

export const accessService = {
  /**
   * Grant access to a user for specific events
   * Uses the database RPC function for proper audit logging
   */
  async grantAccess({ userEmail, eventId, role, organizationId }) {
    const { data, error } = await supabase.rpc('grant_event_access', {
      p_user_email: userEmail,
      p_event_id: eventId,
      p_role: role,
      p_organization_id: organizationId
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Failed to grant access');
    }

    return data;
  },

  /**
   * Revoke access from a user for an event
   * Uses the database RPC function for proper audit logging
   */
  async revokeAccess(accessId) {
    const { data, error } = await supabase.rpc('revoke_event_access', {
      p_access_id: accessId
    });

    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.error || 'Failed to revoke access');
    }

    return data;
  },

  /**
   * Get all users with access to a specific event
   */
  async getEventAccessList(eventId) {
    const { data, error } = await supabase
      .from('event_access')
      .select(`
        id,
        role,
        created_at,
        user_id,
        granted_by,
        invitation_id,
        user_profiles!event_access_user_id_fkey (id, email, full_name)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all events a user has access to
   */
  async getUserEventAccess(userId) {
    const { data, error } = await supabase
      .from('event_access')
      .select(`
        id,
        role,
        created_at,
        event_id,
        events (id, name, status)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get organization members with their access details
   */
  async getOrganizationMembers(organizationId) {
    const { data: accessData, error: accessError } = await supabase
      .from('event_access')
      .select(`
        id,
        role,
        created_at,
        user_id,
        event_id,
        events (name)
      `)
      .eq('organization_id', organizationId);

    if (accessError) throw accessError;

    // Get unique user IDs
    const userIds = [...new Set(accessData?.map(a => a.user_id) || [])];

    if (userIds.length === 0) return [];

    // Get user profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, is_active, last_login_at')
      .in('id', userIds);

    if (profileError) throw profileError;

    // Combine data
    const memberMap = {};
    profiles?.forEach(p => {
      memberMap[p.id] = {
        ...p,
        events: [],
        roles: new Set()
      };
    });

    accessData?.forEach(a => {
      if (memberMap[a.user_id]) {
        memberMap[a.user_id].events.push({
          id: a.event_id,
          name: a.events?.name,
          role: a.role,
          accessId: a.id
        });
        memberMap[a.user_id].roles.add(a.role);
      }
    });

    return Object.values(memberMap).map(m => ({
      ...m,
      roles: Array.from(m.roles)
    }));
  },

  /**
   * Get access audit logs for an event
   */
  async getEventAccessLogs(eventId) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, user_profiles!audit_logs_user_id_fkey(email, full_name)')
      .eq('resource_type', 'event_access')
      .eq('resource_id', eventId)
      .in('action', ['access_grant', 'access_revoke', 'access_update'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all access-related audit logs for an organization
   */
  async getOrganizationAccessLogs(organizationId, options = {}) {
    const { page = 1, limit = 50 } = options;
    
    // First get all event IDs for this org
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .eq('organization_id', organizationId);

    if (eventsError) throw eventsError;

    const eventIds = events?.map(e => e.id) || [];
    
    if (eventIds.length === 0) {
      return { logs: [], total: 0, page, totalPages: 0 };
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*, user_profiles!audit_logs_user_id_fkey(email, full_name)', { count: 'exact' })
      .eq('resource_type', 'event_access')
      .in('resource_id', eventIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      logs: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },

  /**
   * Log an invitation-related action
   * Called by invitationService for audit trail
   */
  async logInvitationAction(userId, action, invitationId, details, reason) {
    return auditService.logAction(
      userId,
      action,
      'invitations',
      invitationId,
      null,
      details,
      reason
    );
  }
};

export default accessService;
