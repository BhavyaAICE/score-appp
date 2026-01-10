/**
 * Audit Service
 * Comprehensive logging and tracking for all system actions
 * 
 * Features:
 * - Full audit trail
 * - Admin override logging
 * - Computation logs
 * - Security alerts
 * - Export capabilities
 */

import { supabase } from '../supabaseClient';
import { rbacService, Resources, Actions } from './rbacService';

export const AuditActions = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  ROLE_CHANGE: 'role_change',
  
  EVENT_CREATE: 'event_create',
  EVENT_UPDATE: 'event_update',
  EVENT_DELETE: 'event_delete',
  EVENT_STATUS_CHANGE: 'status_change',
  
  ROUND_CREATE: 'round_create',
  ROUND_UPDATE: 'round_update',
  ROUND_LOCK: 'round_lock',
  
  SCORE_SUBMIT: 'score_submit',
  SCORE_UPDATE: 'score_update',
  SCORE_OVERRIDE: 'score_override',
  
  RESULTS_COMPUTE: 'compute_scores',
  RESULTS_EXPORT: 'results_export',
  
  TEAM_CREATE: 'team_create',
  TEAM_UPDATE: 'team_update',
  TEAM_DELETE: 'team_delete',
  
  JUDGE_ASSIGN: 'judge_assign',
  JUDGE_REMOVE: 'judge_remove'
};

export const auditService = {
  async logAction(userId, action, resourceType, resourceId, oldValue = null, newValue = null, reason = null, metadata = {}) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          old_value: oldValue,
          new_value: newValue,
          reason,
          ip_address: metadata.ipAddress || null,
          user_agent: metadata.userAgent || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Audit log error:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Failed to create audit log:', err);
      return null;
    }
  },

  async logAdminOverride(resourceType, resourceId, fieldName, oldValue, newValue, reason, overriddenBy) {
    const canOverride = await rbacService.hasPermission(
      overriddenBy,
      Resources.SCORES,
      Actions.OVERRIDE
    );

    if (!canOverride) {
      throw new Error('Permission denied: Cannot perform overrides');
    }

    const { data, error } = await supabase
      .from('admin_overrides')
      .insert([{
        resource_type: resourceType,
        resource_id: resourceId,
        field_name: fieldName,
        old_value: String(oldValue),
        new_value: String(newValue),
        reason,
        overridden_by: overriddenBy
      }])
      .select()
      .single();

    if (error) throw error;

    await this.logAction(
      overriddenBy,
      AuditActions.SCORE_OVERRIDE,
      resourceType,
      resourceId,
      { [fieldName]: oldValue },
      { [fieldName]: newValue },
      reason
    );

    return data;
  },

  async logComputation(roundId, computationType, inputData, outputData, formulaUsed, computedBy) {
    const { data, error } = await supabase
      .from('computation_logs')
      .insert([{
        round_id: roundId,
        computation_type: computationType,
        input_data: inputData,
        output_data: outputData,
        formula_used: formulaUsed,
        computed_by: computedBy
      }])
      .select()
      .single();

    if (error) {
      console.error('Computation log error:', error);
      return null;
    }

    return data;
  },

  async getAuditLogs(filters = {}, pagination = { page: 1, limit: 50 }) {
    let query = supabase
      .from('audit_logs')
      .select('*, user_profiles(email, full_name)', { count: 'exact' })
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
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const offset = (pagination.page - 1) * pagination.limit;
    query = query.range(offset, offset + pagination.limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      logs: data || [],
      total: count || 0,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil((count || 0) / pagination.limit)
    };
  },

  async getAdminOverrides(filters = {}) {
    let query = supabase
      .from('admin_overrides')
      .select('*, user_profiles!admin_overrides_overridden_by_fkey(email, full_name)')
      .order('created_at', { ascending: false });

    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getComputationLogs(roundId) {
    const { data, error } = await supabase
      .from('computation_logs')
      .select('*, user_profiles!computation_logs_computed_by_fkey(email, full_name)')
      .eq('round_id', roundId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getSecurityAlerts(filters = {}) {
    let query = supabase
      .from('security_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.resolved !== undefined) {
      query = query.eq('resolved', filters.resolved);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async resolveSecurityAlert(alertId, resolvedBy, notes = null) {
    const { data, error } = await supabase
      .from('security_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;

    await this.logAction(
      resolvedBy,
      'security_alert_resolved',
      'security_alerts',
      alertId,
      { resolved: false },
      { resolved: true, notes }
    );

    return data;
  },

  async exportAuditLogs(filters = {}, format = 'csv') {
    const { logs } = await this.getAuditLogs(filters, { page: 1, limit: 10000 });

    if (format === 'csv') {
      const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Old Value', 'New Value', 'Reason'];
      const rows = logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.user_profiles?.email || log.user_id,
        log.action,
        log.resource_type,
        log.resource_id || '',
        JSON.stringify(log.old_value || ''),
        JSON.stringify(log.new_value || ''),
        log.reason || ''
      ]);

      return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    return logs;
  },

  async getResourceHistory(resourceType, resourceId) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, user_profiles(email, full_name)')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
};

export default auditService;
