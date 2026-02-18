import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ScoreBreakdownPanel({ eventId, roundId }) {
  const [teams, setTeams] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [viewMode, setViewMode] = useState('comparison');

  useEffect(() => {
    if (roundId) {
      fetchData();
    }
  }, [roundId, eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, criteriaRes, resultsRes] = await Promise.all([
        supabase.from('teams').select('*').eq('event_id', eventId).order('name'),
        supabase.from('round_criteria').select('*').eq('round_id', roundId).order('weight', { ascending: false }),
        supabase.from('computed_results').select('*').eq('round_id', roundId).order('rank')
      ]);

      if (teamsRes.data) setTeams(teamsRes.data);
      if (criteriaRes.data) setCriteria(criteriaRes.data);
      if (resultsRes.data) {
        setResults(resultsRes.data);
        if (resultsRes.data.length > 0) {
          setSelectedTeam(resultsRes.data[0].team_id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => String(t.id) === String(teamId));
    return team?.name || 'Unknown Team';
  };

  const formatScore = (score) => {
    if (score === null || score === undefined) return '-';
    return typeof score === 'number' ? score.toFixed(2) : parseFloat(score).toFixed(2);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading score breakdown...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        <h3 style={{ margin: '0 0 12px', color: '#374151' }}>No Results Yet</h3>
        <p>Scores have not been computed for this round. Results will appear here once the event is locked.</p>
      </div>
    );
  }

  const selectedResult = results.find(r => String(r.team_id) === String(selectedTeam));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e3a5f' }}>
            Score Breakdown
          </h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Compare raw scores with normalized Z-scores
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('comparison')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              background: viewMode === 'comparison' ? '#2563eb' : '#f3f4f6',
              color: viewMode === 'comparison' ? '#fff' : '#6b7280'
            }}
          >
            Comparison View
          </button>
          <button
            onClick={() => setViewMode('ranking')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              background: viewMode === 'ranking' ? '#2563eb' : '#f3f4f6',
              color: viewMode === 'ranking' ? '#fff' : '#6b7280'
            }}
          >
            Ranking Table
          </button>
        </div>
      </div>

      {viewMode === 'comparison' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: '600', color: '#374151', marginRight: '12px' }}>
              Select Team:
            </label>
            <select
              value={selectedTeam || ''}
              onChange={(e) => setSelectedTeam(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            >
              {results.map(result => (
                <option key={result.team_id} value={result.team_id}>
                  #{result.rank} - {getTeamName(result.team_id)}
                </option>
              ))}
            </select>
          </div>

          {selectedResult && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#374151' }}>
                  Final Results
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <ResultCard 
                    label="Rank" 
                    value={`#${selectedResult.rank}`}
                    highlight
                  />
                  <ResultCard 
                    label="Percentile" 
                    value={`${formatScore(selectedResult.percentile)}%`}
                  />
                  <ResultCard 
                    label="Final Score" 
                    value={formatScore(selectedResult.final_score)}
                  />
                  <ResultCard 
                    label="Tied" 
                    value={selectedResult.is_tied ? 'Yes' : 'No'}
                  />
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#374151' }}>
                  Per-Criterion Breakdown
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#6b7280' }}>Criterion</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#6b7280' }}>Weight</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#dc2626' }}>Raw</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#2563eb' }}>Z-Score</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#059669' }}>Weighted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criteria.map(crit => {
                        const rawScores = selectedResult.raw_scores || {};
                        const zScores = selectedResult.z_scores || {};
                        const weightedZScores = selectedResult.weighted_z_scores || {};
                        
                        return (
                          <tr key={crit.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 8px', fontWeight: '500' }}>{crit.name}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{crit.weight}%</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', color: '#dc2626' }}>
                              {formatScore(rawScores[crit.id])}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', color: '#2563eb' }}>
                              {formatScore(zScores[crit.id])}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', color: '#059669', fontWeight: '600' }}>
                              {formatScore(weightedZScores[crit.id])}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{
                background: '#fff7ed',
                borderRadius: '8px',
                padding: '20px',
                gridColumn: '1 / -1'
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#9a3412' }}>
                  Understanding Raw vs Normalized Scores
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#dc2626' }}>Raw Scores</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      The original points given by judges. These can be affected by different judging styles - 
                      some judges score higher or lower than others.
                    </p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#2563eb' }}>Z-Scores</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      Normalized scores that account for each judge's scoring patterns. A Z-score of 0 means 
                      average, positive means above average, negative means below.
                    </p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#059669' }}>Weighted Z-Scores</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      Z-scores multiplied by the criterion weight. Higher weight criteria have more impact 
                      on the final ranking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'ranking' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Rank</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Team</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Final Score</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Percentile</th>
                {criteria.slice(0, 3).map(crit => (
                  <th key={crit.id} style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>
                    {crit.name}
                  </th>
                ))}
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Tied</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, idx) => (
                <tr 
                  key={result.id} 
                  style={{ 
                    borderBottom: '1px solid #f3f4f6',
                    background: idx < 3 ? '#fefce8' : 'transparent'
                  }}
                >
                  <td style={{ 
                    padding: '12px 8px', 
                    fontWeight: '700',
                    color: idx === 0 ? '#ca8a04' : idx === 1 ? '#6b7280' : idx === 2 ? '#a16207' : '#374151'
                  }}>
                    #{result.rank}
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: '500' }}>
                    {getTeamName(result.team_id)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: '#2563eb' }}>
                    {formatScore(result.final_score)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    {formatScore(result.percentile)}%
                  </td>
                  {criteria.slice(0, 3).map(crit => (
                    <td key={crit.id} style={{ padding: '12px 8px', textAlign: 'right', color: '#6b7280' }}>
                      {formatScore((result.weighted_z_scores || {})[crit.id])}
                    </td>
                  ))}
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {result.is_tied ? (
                      <span style={{ color: '#f59e0b', fontWeight: '600' }}>Yes</span>
                    ) : (
                      <span style={{ color: '#10b981' }}>No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? '#2563eb' : '#fff',
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: highlight ? 'rgba(255,255,255,0.8)' : '#6b7280',
        marginBottom: '4px'
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '24px', 
        fontWeight: '700',
        color: highlight ? '#fff' : '#1e3a5f'
      }}>
        {value}
      </div>
    </div>
  );
}

export default ScoreBreakdownPanel;
