/**
 * Invitation Service
 * Handles creating, sending, and managing user invitations
 */

import { supabase } from '../supabaseClient';

export const InvitationRoles = {
  CO_ADMIN: 'co_admin',
  EVENT_ADMIN: 'event_admin',
  JUDGE: 'judge',
  VIEWER: 'viewer'
};

export const RolePermissions = {
  co_admin: {
    displayName: 'Co-Admin',
    description: 'Full access to manage events and invite users',
    permissions: [
      { key: 'create_events', label: 'Create and manage events', allowed: true },
      { key: 'invite_users', label: 'Invite other users', allowed: true },
      { key: 'manage_all_events', label: 'Manage all organization events', allowed: true },
      { key: 'view_results', label: 'View all results', allowed: true },
      { key: 'export_data', label: 'Export data', allowed: true },
      { key: 'score_teams', label: 'Score teams', allowed: false },
      { key: 'manage_users', label: 'Manage organization members', allowed: true },
      { key: 'delete_events', label: 'Delete events', allowed: false }
    ],
    color: '#7c3aed'
  },
  event_admin: {
    displayName: 'Event Admin',
    description: 'Manage assigned events only',
    permissions: [
      { key: 'create_events', label: 'Create events', allowed: false },
      { key: 'invite_users', label: 'Invite users', allowed: false },
      { key: 'manage_assigned_events', label: 'Manage assigned events', allowed: true },
      { key: 'view_results', label: 'View event results', allowed: true },
      { key: 'export_data', label: 'Export event data', allowed: true },
      { key: 'score_teams', label: 'Score teams', allowed: false },
      { key: 'manage_users', label: 'Manage users', allowed: false },
      { key: 'delete_events', label: 'Delete events', allowed: false }
    ],
    color: '#3b82f6'
  },
  judge: {
    displayName: 'Judge',
    description: 'Score teams in assigned events',
    permissions: [
      { key: 'create_events', label: 'Create events', allowed: false },
      { key: 'invite_users', label: 'Invite users', allowed: false },
      { key: 'manage_events', label: 'Manage events', allowed: false },
      { key: 'view_final_results', label: 'View final results', allowed: false },
      { key: 'export_data', label: 'Export data', allowed: false },
      { key: 'score_teams', label: 'Score assigned teams', allowed: true },
      { key: 'view_own_scores', label: 'View own submitted scores', allowed: true },
      { key: 'manage_users', label: 'Manage users', allowed: false }
    ],
    color: '#10b981'
  },
  viewer: {
    displayName: 'Viewer',
    description: 'View published results only',
    permissions: [
      { key: 'create_events', label: 'Create events', allowed: false },
      { key: 'invite_users', label: 'Invite users', allowed: false },
      { key: 'manage_events', label: 'Manage events', allowed: false },
      { key: 'view_published_results', label: 'View published results', allowed: true },
      { key: 'export_data', label: 'Export data', allowed: false },
      { key: 'score_teams', label: 'Score teams', allowed: false },
      { key: 'manage_users', label: 'Manage users', allowed: false }
    ],
    color: '#6b7280'
  }
};

export const invitationService = {
  /**
   * Create and send an invitation via edge function
   */
  async createInvitation({ email, role, eventIds, message, organizationId }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user profile for inviter name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Get organization name
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

      // Get event names
      const { data: events } = await supabase
        .from('events')
        .select('id, name')
        .in('id', eventIds);

      // Create invitation in database
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          organization_id: organizationId,
          invited_by: user.id,
          email: email.toLowerCase().trim(),
          role,
          event_ids: eventIds,
          message,
          status: 'pending'
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send email via edge function
      try {
        const acceptUrl = `${window.location.origin}/accept-invitation`;
        
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation', {
          body: {
            email: email.toLowerCase().trim(),
            role,
            eventNames: events?.map(e => e.name) || [],
            inviterName: profile?.full_name || profile?.email || 'Admin',
            organizationName: org?.name || 'Organization',
            message,
            invitationToken: invitation.token,
            acceptUrl
          }
        });

        if (emailError) {
          console.warn('Email sending failed:', emailError);
          // Don't throw - invitation was created, email just didn't send
        } else {
          console.log('Email sent successfully:', emailData);
        }
      } catch (emailError) {
        console.warn('Email service error:', emailError.message);
        // Invitation is still created, email just didn't send
      }

      return { success: true, invitation };
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  },

  /**
   * Create bulk invitations
   */
  async createBulkInvitations(invitations, organizationId) {
    const results = [];
    
    for (const inv of invitations) {
      try {
        const result = await this.createInvitation({
          ...inv,
          organizationId
        });
        results.push({ email: inv.email, success: true, invitation: result.invitation });
      } catch (error) {
        results.push({ email: inv.email, success: false, error: error.message });
      }
    }
    
    return results;
  },

  /**
   * Get pending invitations for an organization
   */
  async getOrganizationInvitations(organizationId) {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get invitations sent to the current user's email
   */
  async getMyInvitations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        organizations (name)
      `)
      .eq('email', user.email.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get invitation by token (for accept page)
   */
  async getInvitationByToken(token) {
    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        organizations (name)
      `)
      .eq('token', token)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Accept an invitation
   */
  async acceptInvitation(token) {
    const { data, error } = await supabase.rpc('accept_invitation', {
      p_token: token
    });

    if (error) throw error;
    return data;
  },

  /**
   * Cancel/revoke an invitation
   */
  async cancelInvitation(invitationId) {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', invitationId);

    if (error) throw error;
  },

  /**
   * Resend an invitation email
   */
  async resendInvitation(invitationId) {
    // Get invitation details
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select(`
        *,
        organizations (name)
      `)
      .eq('id', invitationId)
      .single();

    if (fetchError) throw fetchError;

    // Reset expiration
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        expires_at: newExpiry,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) throw updateError;

    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Get event names
    const { data: events } = await supabase
      .from('events')
      .select('id, name')
      .in('id', invitation.event_ids || []);

    // Resend email
    const acceptUrl = `${window.location.origin}/accept-invitation`;
    
    await supabase.functions.invoke('send-invitation', {
      body: {
        email: invitation.email,
        role: invitation.role,
        eventNames: events?.map(e => e.name) || [],
        inviterName: profile?.full_name || profile?.email || 'Admin',
        organizationName: invitation.organizations?.name || 'Organization',
        message: invitation.message,
        invitationToken: invitation.token,
        acceptUrl
      }
    });

    return { success: true };
  },

  /**
   * Get shared events for current user
   */
  async getSharedEvents() {
    const { data, error } = await supabase.rpc('get_user_shared_events');
    if (error) throw error;
    return data || [];
  },

  /**
   * Get users with access to an event
   */
  async getEventAccessList(eventId) {
    const { data, error } = await supabase
      .from('event_access')
      .select(`
        *,
        user_profiles!event_access_user_id_fkey (id, email, full_name)
      `)
      .eq('event_id', eventId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Remove user access from an event
   */
  async removeEventAccess(eventAccessId) {
    const { error } = await supabase
      .from('event_access')
      .delete()
      .eq('id', eventAccessId);

    if (error) throw error;
  }
};
