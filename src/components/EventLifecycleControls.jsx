/**
 * Event Lifecycle Controls Component
 * UI for transitioning event states
 */

import React, { useState } from 'react';
import { eventLifecycleService, EventStatus } from '../services/eventLifecycleService';
import { useApp } from '../context/AppContext';
import EventStatusBadge from './EventStatusBadge';

function EventLifecycleControls({ event, onStatusChange }) {
  const { user } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(null);

  const currentStatus = event?.status || EventStatus.DRAFT;

  const transitions = {
    [EventStatus.DRAFT]: {
      next: EventStatus.LIVE_JUDGING,
      label: 'Start Judging',
      color: '#10b981',
      description: 'Open the event for judges to submit evaluations'
    },
    [EventStatus.LIVE_JUDGING]: {
      next: EventStatus.LOCKED,
      label: 'Lock Event',
      color: '#f59e0b',
      description: 'Close judging and lock all scores',
      warning: 'No more evaluations can be submitted after locking'
    },
    [EventStatus.LOCKED]: {
      next: EventStatus.PUBLISHED,
      label: 'Publish Results',
      color: '#2563eb',
      description: 'Make results publicly visible',
      warning: 'Results will be visible to all participants'
    }
  };

  const currentTransition = transitions[currentStatus];

  const handleTransition = async () => {
    if (!user?.id || !currentTransition) return;

    setLoading(true);
    setError(null);

    try {
      const canTransition = await eventLifecycleService.canTransition(
        event.id,
        currentTransition.next,
        user.id
      );

      if (!canTransition.allowed) {
        setError(canTransition.reason);
        setLoading(false);
        return;
      }

      const result = await eventLifecycleService.transitionEvent(
        event.id,
        currentTransition.next,
        user.id,
        reason
      );

      setShowConfirm(null);
      setReason('');
      
      if (onStatusChange) {
        onStatusChange(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e3a5f' }}>
          Event Status
        </h3>
        <EventStatusBadge status={currentStatus} size="large" />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ flex: 1 }}>
          {[EventStatus.DRAFT, EventStatus.LIVE_JUDGING, EventStatus.LOCKED, EventStatus.PUBLISHED].map((status, idx) => (
            <div key={status} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                background: currentStatus === status 
                  ? '#2563eb' 
                  : Object.values(EventStatus).indexOf(currentStatus) > idx 
                    ? '#10b981' 
                    : '#e5e7eb',
                color: currentStatus === status || Object.values(EventStatus).indexOf(currentStatus) > idx
                  ? '#fff'
                  : '#6b7280'
              }}>
                {idx + 1}
              </div>
              {idx < 3 && (
                <div style={{
                  width: '60px',
                  height: '2px',
                  background: Object.values(EventStatus).indexOf(currentStatus) > idx
                    ? '#10b981'
                    : '#e5e7eb'
                }} />
              )}
            </div>
          ))}
        </div>
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

      {showConfirm === 'advance' ? (
        <div style={{
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: '0 0 12px', fontWeight: '600' }}>
            {currentTransition?.description}
          </p>
          {currentTransition?.warning && (
            <p style={{ 
              margin: '0 0 12px', 
              color: '#f59e0b',
              fontSize: '14px'
            }}>
              Warning: {currentTransition.warning}
            </p>
          )}
          <textarea
            placeholder="Reason for status change (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              marginBottom: '12px',
              resize: 'vertical',
              minHeight: '60px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleTransition}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: currentTransition?.color || '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
            <button
              onClick={() => setShowConfirm(null)}
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px' }}>
          {currentTransition && (
            <button
              onClick={() => setShowConfirm('advance')}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: currentTransition.color,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {currentTransition.label}
            </button>
          )}
          
          {currentStatus === EventStatus.PUBLISHED && (
            <span style={{
              padding: '12px 24px',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              Event lifecycle complete - no further transitions available
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default EventLifecycleControls;
