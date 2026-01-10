import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';

const OVERRIDE_TYPES = [
  { value: 'score_correction', label: 'Score Correction', description: 'Fix an incorrectly entered score' },
  { value: 'technical_error', label: 'Technical Error', description: 'Correct a system or data error' },
  { value: 'disqualification', label: 'Disqualification', description: 'Remove score due to rule violation' },
  { value: 'reinstatement', label: 'Reinstatement', description: 'Restore a previously removed score' },
  { value: 'other', label: 'Other', description: 'Other administrative reason' }
];

function AdminOverrideModal({ 
  isOpen, 
  onClose, 
  evaluationId, 
  criterionId,
  currentScore,
  teamName,
  criterionName,
  onOverrideComplete 
}) {
  const { user } = useApp();
  const [newScore, setNewScore] = useState(currentScore || 0);
  const [reason, setReason] = useState('');
  const [overrideType, setOverrideType] = useState('score_correction');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('A reason is required for all score overrides');
      return;
    }

    if (newScore === currentScore) {
      setError('New score must be different from current score');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('log_score_override', {
          p_evaluation_id: evaluationId,
          p_criterion_id: criterionId,
          p_new_score: newScore,
          p_reason: reason,
          p_override_type: overrideType
        });

      if (rpcError) {
        if (rpcError.message?.includes('42883')) {
          const { error: insertError } = await supabase
            .from('score_overrides')
            .insert({
              evaluation_id: evaluationId,
              criterion_id: criterionId,
              previous_score: currentScore,
              new_score: newScore,
              reason: reason,
              override_type: overrideType,
              overridden_by: user.id
            });

          if (insertError) throw insertError;
        } else {
          throw rpcError;
        }
      }

      if (onOverrideComplete) {
        onOverrideComplete({
          evaluationId,
          criterionId,
          previousScore: currentScore,
          newScore,
          reason,
          overrideType
        });
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit override');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '480px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, color: '#1e3a5f', fontSize: '20px' }}>
            Admin Score Override
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              lineHeight: 1
            }}
          >
            x
          </button>
        </div>

        <div style={{
          background: '#fef3c7',
          borderLeft: '4px solid #f59e0b',
          padding: '12px 16px',
          borderRadius: '0 8px 8px 0',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
            This action will be logged with your user ID, timestamp, reason, and the previous value.
            Overrides are auditable and cannot be deleted.
          </p>
        </div>

        <div style={{
          background: '#f8fafc',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>Team:</span>
            <span style={{ marginLeft: '8px', fontWeight: '600', color: '#1e3a5f' }}>
              {teamName || 'Unknown'}
            </span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>Criterion:</span>
            <span style={{ marginLeft: '8px', fontWeight: '600', color: '#1e3a5f' }}>
              {criterionName || 'Unknown'}
            </span>
          </div>
          <div>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>Current Score:</span>
            <span style={{ marginLeft: '8px', fontWeight: '600', color: '#dc2626' }}>
              {currentScore}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#374151'
            }}>
              Override Type *
            </label>
            <select
              value={overrideType}
              onChange={(e) => setOverrideType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                background: '#fff'
              }}
            >
              {OVERRIDE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#374151'
            }}>
              New Score *
            </label>
            <input
              type="number"
              step="0.01"
              value={newScore}
              onChange={(e) => setNewScore(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#374151'
            }}>
              Reason for Override *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this override is necessary..."
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: loading ? '#9ca3af' : '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {loading ? 'Processing...' : 'Submit Override'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminOverrideModal;
