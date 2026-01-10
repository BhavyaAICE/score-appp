import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ACTION_LABELS = {
  'create': 'Created',
  'update': 'Updated',
  'delete': 'Deleted',
  'status_change': 'Status Changed',
  'score_submit': 'Score Submitted',
  'score_override': 'Score Override',
  'lock': 'Locked',
  'publish': 'Published',
  'login': 'Login',
  'logout': 'Logout',
  'permission_change': 'Permission Changed'
};

const RESOURCE_LABELS = {
  'events': 'Event',
  'teams': 'Team',
  'rounds': 'Round',
  'round_criteria': 'Criterion',
  'raw_evaluations': 'Evaluation',
  'computed_results': 'Results',
  'user_profiles': 'User',
  'organizations': 'Organization'
};

function AuditTrailViewer({ eventId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [eventId, filters, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, user_profiles(email, full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.resource) {
        query = query.eq('resource_type', filters.resource);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error, count } = await query;

      if (error) {
        console.warn('Audit logs table may not exist:', error);
        setLogs([]);
        setTotalCount(0);
      } else {
        let filteredData = data || [];
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredData = filteredData.filter(log => 
            log.user_profiles?.email?.toLowerCase().includes(searchLower) ||
            log.user_profiles?.full_name?.toLowerCase().includes(searchLower) ||
            log.action?.toLowerCase().includes(searchLower) ||
            log.resource_type?.toLowerCase().includes(searchLower)
          );
        }
        setLogs(filteredData);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action) => {
    const colors = {
      'create': '#10b981',
      'update': '#3b82f6',
      'delete': '#dc2626',
      'status_change': '#8b5cf6',
      'score_submit': '#06b6d4',
      'score_override': '#f59e0b',
      'lock': '#d97706',
      'publish': '#059669',
      'login': '#6366f1',
      'logout': '#6b7280'
    };
    return colors[action] || '#6b7280';
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#1e3a5f' }}>
          Audit Trail
        </h2>
        <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
          Complete history of all actions in the system
        </p>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px'
      }}>
        <input
          type="text"
          placeholder="Search by user or action..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '200px'
          }}
        />
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filters.resource}
          onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="">All Resources</option>
          {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        <button
          onClick={() => setFilters({ action: '', resource: '', dateFrom: '', dateTo: '', search: '' })}
          style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Clear Filters
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <h3 style={{ margin: '0 0 12px', color: '#374151' }}>No Audit Logs</h3>
          <p>No actions have been recorded yet, or no logs match your filters.</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Timestamp</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>User</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Action</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Resource</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#6b7280', fontSize: '13px' }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>
                        {log.user_profiles?.full_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {log.user_profiles?.email}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: `${getActionColor(log.action)}20`,
                        color: getActionColor(log.action)
                      }}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: '#374151' }}>
                        {RESOURCE_LABELS[log.resource_type] || log.resource_type}
                      </span>
                      {log.resource_id && (
                        <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block' }}>
                          {log.resource_id.substring(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', maxWidth: '300px' }}>
                      {log.reason && (
                        <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px' }}>
                          {log.reason}
                        </div>
                      )}
                      {(log.old_value || log.new_value) && (
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {log.old_value && (
                            <span>From: {JSON.stringify(log.old_value).substring(0, 50)}... </span>
                          )}
                          {log.new_value && (
                            <span>To: {JSON.stringify(log.new_value).substring(0, 50)}...</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} of {totalCount} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  style={{
                    padding: '8px 16px',
                    background: page === 0 ? '#e5e7eb' : '#2563eb',
                    color: page === 0 ? '#9ca3af' : '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  style={{
                    padding: '8px 16px',
                    background: page >= totalPages - 1 ? '#e5e7eb' : '#2563eb',
                    color: page >= totalPages - 1 ? '#9ca3af' : '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AuditTrailViewer;
