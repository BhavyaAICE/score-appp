import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import ScoreBreakdownPanel from '../components/ScoreBreakdownPanel';
import FormulaExplanation from '../components/FormulaExplanation';
import JudgeAnalytics from '../components/JudgeAnalytics';
import AuditTrailViewer from '../components/AuditTrailViewer';
import ExportPanel from '../components/ExportPanel';

function TransparencyDashboard() {
  const { eventId } = useParams();
  const { user } = useApp();
  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('scores');
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      const { data: roundsData, error: roundsError } = await supabase
        .from('rounds')
        .select('*')
        .eq('event_id', eventId)
        .order('round_number');

      if (!roundsError && roundsData) {
        setRounds(roundsData);
        if (roundsData.length > 0) {
          setSelectedRound(roundsData[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch event data:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'scores', label: 'Score Breakdown' },
    { id: 'formula', label: 'How Scoring Works' },
    { id: 'judges', label: 'Judge Analytics' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'export', label: 'Export Reports' }
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        color: '#6b7280'
      }}>
        Loading transparency dashboard...
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#6b7280'
      }}>
        <h2>Event not found</h2>
        <Link to="/events" style={{ color: '#2563eb' }}>Back to Events</Link>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px'
    }}>
      <div style={{
        marginBottom: '24px'
      }}>
        <Link
          to={`/events/${eventId}`}
          style={{
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '12px'
          }}
        >
          &larr; Back to Event
        </Link>
        <h1 style={{
          margin: 0,
          fontSize: '28px',
          color: '#1e3a5f'
        }}>
          Transparency Dashboard
        </h1>
        <p style={{
          margin: '8px 0 0',
          color: '#6b7280',
          fontSize: '16px'
        }}>
          {event.name} - Complete scoring transparency and audit information
        </p>
      </div>

      {rounds.length > 1 && (
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <label style={{ fontWeight: '600', color: '#374151' }}>Round:</label>
          <select
            value={selectedRound || ''}
            onChange={(e) => setSelectedRound(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              background: '#fff'
            }}
          >
            {rounds.map(round => (
              <option key={round.id} value={round.id}>
                Round {round.round_number}: {round.name || `Round ${round.round_number}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        borderBottom: '1px solid #e5e7eb',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === tab.id ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        minHeight: '500px'
      }}>
        {activeTab === 'scores' && (
          <ScoreBreakdownPanel 
            eventId={eventId} 
            roundId={selectedRound}
          />
        )}
        {activeTab === 'formula' && (
          <FormulaExplanation />
        )}
        {activeTab === 'judges' && (
          <JudgeAnalytics 
            eventId={eventId} 
            roundId={selectedRound}
          />
        )}
        {activeTab === 'audit' && (
          <AuditTrailViewer 
            eventId={eventId}
          />
        )}
        {activeTab === 'export' && (
          <ExportPanel 
            eventId={eventId}
            eventName={event.name}
            roundId={selectedRound}
          />
        )}
      </div>
    </div>
  );
}

export default TransparencyDashboard;
