import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function ScoreOverrideHistory({ evaluationId, eventId }) {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverrides();
  }, [evaluationId, eventId]);

  const fetchOverrides = async () => {
    try {
      let query = supabase
        .from('score_overrides')
        .select(`
          *,
          user_profiles!overridden_by(email, full_name),
          approved_by_user:user_profiles!approved_by(email, full_name)
        `)
        .order('overridden_at', { ascending: false });

      if (evaluationId) {
        query = query.eq('evaluation_id', evaluationId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Score overrides table may not exist:', error);
        setOverrides([]);
      } else {
        setOverrides(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch overrides:', err);
      setOverrides([]);
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
      minute: '2-digit'
    });
  };

  const getTypeColor = (type) => {
    const colors = {
      score_correction: { bg: '#dbeafe', text: '#1d4ed8' },
      technical_error: { bg: '#fef3c7', text: '#d97706' },
      disqualification: { bg: '#fee2e2', text: '#dc2626' },
      reinstatement: { bg: '#dcfce7', text: '#16a34a' },
      other: { bg: '#f3f4f6', text: '#6b7280' }
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
        Loading override history...
      </div>
    );
  }

  if (overrides.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6b7280',
        background: '#f8fafc',
        borderRadius: '8px'
      }}>
        No score overrides recorded
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        background: '#f8fafc'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#1e3a5f' }}>
          Score Override History ({overrides.length})
        </h3>
      </div>

      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        {overrides.map((override) => {
          const typeColor = getTypeColor(override.override_type);
          return (
            <div
              key={override.id}
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f3f4f6'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '4px',
                  background: typeColor.bg,
                  color: typeColor.text,
                  textTransform: 'capitalize'
                }}>
                  {override.override_type?.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formatDate(override.overridden_at)}
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  padding: '8px 12px',
                  background: '#fee2e2',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: '#dc2626', marginBottom: '2px' }}>
                    Previous
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626' }}>
                    {override.previous_score ?? 'N/A'}
                  </div>
                </div>
                <span style={{ color: '#9ca3af', fontSize: '20px' }}>
                  -&gt;
                </span>
                <div style={{
                  padding: '8px 12px',
                  background: '#dcfce7',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: '#16a34a', marginBottom: '2px' }}>
                    New
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>
                    {override.new_score}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '10px 12px',
                background: '#f8fafc',
                borderRadius: '6px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                  Reason:
                </div>
                <div style={{ fontSize: '14px', color: '#374151' }}>
                  {override.reason}
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Overridden by:{' '}
                <span style={{ fontWeight: '600', color: '#374151' }}>
                  {override.user_profiles?.full_name || override.user_profiles?.email || 'Unknown'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScoreOverrideHistory;
