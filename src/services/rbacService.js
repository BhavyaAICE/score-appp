/**
 * RBAC Service
 * Role-Based Access Control implementation for FairScore
 * 
 * Roles:
 * - super_admin: Full system control
 * - event_admin: Manages assigned events only
 * - judge: Submits evaluations only
 * - viewer: Read-only access to results
 */

import { supabase } from '../supabaseClient';

export const Roles = {
  SUPER_ADMIN: 'super_admin',
  CO_ADMIN: 'co_admin',
  EVENT_ADMIN: 'event_admin',
  JUDGE: 'judge',
  VIEWER: 'viewer'
};

export const Resources = {
  EVENTS: 'events',
  USERS: 'users',
  SCORES: 'scores',
  RESULTS: 'results',
  AUDIT: 'audit',
  BRANDING: 'branding',
  SETTINGS: 'settings'
};

export const Actions = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LOCK: 'lock',
  PUBLISH: 'publish',
  SUBMIT: 'submit',
  OVERRIDE: 'override',
  COMPUTE: 'compute',
  EXPORT: 'export'
};

const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export const rbacService = {
  async getUserProfile(userId) {
    // First get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return null;

    // Get role from user_roles table
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Return profile with role from user_roles table
    return {
      ...profile,
      role: roleData?.role || Roles.VIEWER
    };
  },

  async createUserProfile(userId, email, fullName, role = Roles.VIEWER) {
    // Check if profile already exists (may have been created by trigger)
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      // Profile already exists, just return it
      return existing;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{
        id: userId,
        email,
        full_name: fullName
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateUserRole(userId, newRole, updatedBy) {
    const oldProfile = await this.getUserProfile(userId);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await this.createAuditLog(
      updatedBy,
      'role_change',
      'user_profiles',
      userId,
      { role: oldProfile?.role },
      { role: newRole }
    );

    permissionCache.delete(userId);
    
    return data;
  },

  async hasPermission(userId, resource, action) {
    const cacheKey = `${userId}:${resource}:${action}`;
    const cached = permissionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.allowed;
    }

    try {
      const { data, error } = await supabase
        .rpc('has_permission', {
          p_user_id: userId,
          p_resource: resource,
          p_action: action
        });

      if (error) {
        if (error.code === '42883') {
          const profile = await this.getUserProfile(userId);
          if (!profile) return false;
          if (profile.role === Roles.SUPER_ADMIN) return true;
          
          const permissions = await this.getPermissionsForRole(profile.role);
          const allowed = permissions.some(
            p => p.resource === resource && p.action === action && p.allowed
          );
          permissionCache.set(cacheKey, { allowed, timestamp: Date.now() });
          return allowed;
        }
        console.error('Permission check error:', error);
        return false;
      }

      permissionCache.set(cacheKey, { allowed: data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.error('Permission check failed:', err);
      return false;
    }
  },

  async canAccessEvent(userId, eventId) {
    try {
      const { data, error } = await supabase
        .rpc('can_access_event', {
          p_user_id: userId,
          p_event_id: eventId
        });

      if (error) {
        if (error.code === '42883') {
          const profile = await this.getUserProfile(userId);
          if (!profile) return false;
          if (profile.role === Roles.SUPER_ADMIN) return true;
          if (profile.role === Roles.EVENT_ADMIN) {
            const { data: assignments } = await supabase
              .from('event_admin_assignments')
              .select('id')
              .eq('user_id', userId)
              .eq('event_id', eventId)
              .maybeSingle();
            return !!assignments;
          }
          return false;
        }
        console.error('Event access check error:', error);
        return false;
      }

      return data;
    } catch (err) {
      console.error('Event access check failed:', err);
      return false;
    }
  },

  async getPermissionsForRole(role) {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('role', role);

      if (error) {
        if (error.code === '42P01') {
          return this.getDefaultPermissions(role);
        }
        throw error;
      }
      return data || this.getDefaultPermissions(role);
    } catch (err) {
      console.warn('Permissions table not available, using defaults');
      return this.getDefaultPermissions(role);
    }
  },

  getDefaultPermissions(role) {
    const superAdminPerms = [
      { resource: 'events', action: 'create', allowed: true },
      { resource: 'events', action: 'read', allowed: true },
      { resource: 'events', action: 'update', allowed: true },
      { resource: 'events', action: 'delete', allowed: true },
      { resource: 'events', action: 'lock', allowed: true },
      { resource: 'events', action: 'publish', allowed: true },
      { resource: 'users', action: 'create', allowed: true },
      { resource: 'users', action: 'read', allowed: true },
      { resource: 'users', action: 'update', allowed: true },
      { resource: 'users', action: 'delete', allowed: true },
      { resource: 'scores', action: 'read', allowed: true },
      { resource: 'scores', action: 'override', allowed: true },
      { resource: 'results', action: 'compute', allowed: true },
      { resource: 'results', action: 'read', allowed: true },
      { resource: 'results', action: 'export', allowed: true },
      { resource: 'audit', action: 'read', allowed: true },
    ];

    const eventAdminPerms = [
      { resource: 'events', action: 'create', allowed: true },
      { resource: 'events', action: 'read', allowed: true },
      { resource: 'events', action: 'update', allowed: true },
      { resource: 'events', action: 'lock', allowed: true },
      { resource: 'events', action: 'publish', allowed: true },
      { resource: 'users', action: 'read', allowed: true },
      { resource: 'scores', action: 'read', allowed: true },
      { resource: 'results', action: 'compute', allowed: true },
      { resource: 'results', action: 'read', allowed: true },
      { resource: 'results', action: 'export', allowed: true },
      { resource: 'audit', action: 'read', allowed: true },
    ];

    const judgePerms = [
      { resource: 'events', action: 'read', allowed: true },
      { resource: 'scores', action: 'read', allowed: true },
      { resource: 'scores', action: 'submit', allowed: true },
      { resource: 'results', action: 'read', allowed: true },
    ];

    const viewerPerms = [
      { resource: 'events', action: 'read', allowed: true },
      { resource: 'scores', action: 'read', allowed: true },
      { resource: 'results', action: 'read', allowed: true },
    ];

    switch (role) {
      case Roles.SUPER_ADMIN: return superAdminPerms;
      case Roles.EVENT_ADMIN: return eventAdminPerms;
      case Roles.JUDGE: return judgePerms;
      default: return viewerPerms;
    }
  },

  async assignEventAdmin(userId, eventId, assignedBy) {
    const { data, error } = await supabase
      .from('event_admin_assignments')
      .insert([{
        user_id: userId,
        event_id: eventId,
        created_by: assignedBy
      }])
      .select()
      .single();

    if (error) throw error;

    await this.createAuditLog(
      assignedBy,
      'event_admin_assigned',
      'event_admin_assignments',
      data.id,
      null,
      { user_id: userId, event_id: eventId }
    );

    return data;
  },

  async removeEventAdmin(userId, eventId, removedBy) {
    const { error } = await supabase
      .from('event_admin_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);

    if (error) throw error;

    await this.createAuditLog(
      removedBy,
      'event_admin_removed',
      'event_admin_assignments',
      null,
      { user_id: userId, event_id: eventId },
      null
    );
  },

  async getEventAdmins(eventId) {
    const { data, error } = await supabase
      .from('event_admin_assignments')
      .select(`
        *,
        user_profiles (
          id,
          email,
          full_name,
          role
        )
      `)
      .eq('event_id', eventId);

    if (error) throw error;
    return data || [];
  },

  async getUserEvents(userId) {
    const profile = await this.getUserProfile(userId);
    
    if (!profile) return [];

    if (profile.role === Roles.SUPER_ADMIN) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }

    if (profile.role === Roles.EVENT_ADMIN) {
      const { data, error } = await supabase
        .from('event_admin_assignments')
        .select(`
          event_id,
          events (*)
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      return (data || []).map(d => d.events).filter(Boolean);
    }

    return [];
  },

  async createAuditLog(userId, action, resourceType, resourceId, oldValue = null, newValue = null, reason = null) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_value: oldValue,
        new_value: newValue,
        reason
      }])
      .select()
      .single();

    if (error) {
      console.error('Audit log error:', error);
      return null;
    }
    
    return data;
  },

  async getAuditLogs(filters = {}) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  clearCache(userId = null) {
    if (userId) {
      for (const key of permissionCache.keys()) {
        if (key.startsWith(userId)) {
          permissionCache.delete(key);
        }
      }
    } else {
      permissionCache.clear();
    }
  }
};

export function requirePermission(resource, action) {
  return async (userId) => {
    const allowed = await rbacService.hasPermission(userId, resource, action);
    if (!allowed) {
      throw new Error(`Permission denied: ${action} on ${resource}`);
    }
    return true;
  };
}

export function requireRole(...roles) {
  return async (userId) => {
    const profile = await rbacService.getUserProfile(userId);
    if (!profile || !roles.includes(profile.role)) {
      throw new Error(`Role required: ${roles.join(' or ')}`);
    }
    return true;
  };
}

export function requireEventAccess(eventId) {
  return async (userId) => {
    const canAccess = await rbacService.canAccessEvent(userId, eventId);
    if (!canAccess) {
      throw new Error('Access denied to this event');
    }
    return true;
  };
}
