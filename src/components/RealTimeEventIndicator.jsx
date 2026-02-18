import React, { useEffect, useState, useCallback } from 'react';
import { eventLifecycleService, EventStatus } from '../services/eventLifecycleService';
import EventStatusBadge from './EventStatusBadge';

function RealTimeEventIndicator({ eventId, showDetails = false, onStateChange }) {
  const [eventState, setEventState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const fetchEventState = useCallback(async () => {
    try {
      const state = await eventLifecycleService.getEventState(eventId);
      setEventState(state);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch event state:', err);
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventState();

    const unsubscribe = eventLifecycleService.subscribeToEventStatus(eventId, (newEvent) => {
      setEventState(prev => ({
        ...prev,
        status: newEvent.status,
        locked_at: newEvent.locked_at,
        published_at: newEvent.published_at,
        can_modify: !['locked', 'published'].includes(newEvent.status),
        can_submit_scores: newEvent.status === 'live_judging',
        can_publish: newEvent.status === 'locked'
      }));
      setIsLive(true);
      
      if (onStateChange) {
        onStateChange(newEvent);
      }

      setTimeout(() => setIsLive(false), 3000);
    });

    return () => {
      unsubscribe();
    };
  }, [eventId, fetchEventState, onStateChange]);

  if (loading) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: '#f3f4f6',
        borderRadius: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#9ca3af',
          animation: 'pulse 1.5s infinite'
        }} />
        <span style={{ color: '#6b7280', fontSize: '14px' }}>Loading...</span>
      </div>
    );
  }

  if (!eventState) {
    return null;
  }

  const statusColors = {
    [EventStatus.DRAFT]: { pulse: '#9ca3af', text: '#6b7280' },
    [EventStatus.LIVE_JUDGING]: { pulse: '#10b981', text: '#059669' },
    [EventStatus.LOCKED]: { pulse: '#f59e0b', text: '#d97706' },
    [EventStatus.PUBLISHED]: { pulse: '#3b82f6', text: '#2563eb' }
  };

  const currentColors = statusColors[eventState.status] || statusColors[EventStatus.DRAFT];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: isLive ? '#ecfdf5' : '#fff',
        border: `1px solid ${isLive ? '#10b981' : '#e5e7eb'}`,
        borderRadius: '8px',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: currentColors.pulse,
          boxShadow: eventState.status === EventStatus.LIVE_JUDGING 
            ? `0 0 0 3px rgba(16, 185, 129, 0.2)` 
            : 'none',
          animation: eventState.status === EventStatus.LIVE_JUDGING 
            ? 'pulse 2s infinite' 
            : 'none'
        }} />
        
        <EventStatusBadge status={eventState.status} size="medium" showIcon={false} />
        
        {isLive && (
          <span style={{
            fontSize: '12px',
            color: '#10b981',
            fontWeight: '600',
            marginLeft: 'auto'
          }}>
            Updated
          </span>
        )}
      </div>

      {showDetails && eventState.stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '12px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px'
        }}>
          <StatItem label="Teams" value={eventState.stats.teams || 0} />
          <StatItem label="Rounds" value={eventState.stats.rounds || 0} />
          <StatItem label="Judges" value={eventState.stats.judges || 0} />
          <StatItem label="Evaluations" value={eventState.stats.submitted_evaluations || 0} />
        </div>
      )}

      {showDetails && (
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <PermissionIndicator 
            allowed={eventState.can_modify} 
            label="Modify Data" 
          />
          <PermissionIndicator 
            allowed={eventState.can_submit_scores} 
            label="Submit Scores" 
          />
          <PermissionIndicator 
            allowed={eventState.can_compute_results} 
            label="Compute Results" 
          />
          <PermissionIndicator 
            allowed={eventState.can_publish} 
            label="Publish" 
          />
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e3a5f' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>
        {label}
      </div>
    </div>
  );
}

function PermissionIndicator({ allowed, label }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      fontSize: '12px',
      borderRadius: '4px',
      background: allowed ? '#dcfce7' : '#f3f4f6',
      color: allowed ? '#16a34a' : '#9ca3af'
    }}>
      <span style={{ fontSize: '10px' }}>
        {allowed ? '\u2713' : '\u2715'}
      </span>
      {label}
    </span>
  );
}

export default RealTimeEventIndicator;
