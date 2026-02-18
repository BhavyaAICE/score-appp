import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getRoundResults } from '../services/computeRoundService';
import './RoundResults.css';

function RoundResults({ roundId }) {
  const [round, setRound] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('summary');
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    if (roundId) {
      loadResults();
    }
  }, [roundId]);

  async function loadResults() {
    setLoading(true);

    const { data: roundData, error: roundError } = await supabase
      .from('rounds')
      .select(`
        *,
        events (
          name
        )
      `)
      .eq('id', roundId)
      .maybeSingle();

    if (roundError) {
      console.error('Error loading round:', roundError);
      setLoading(false);
      return;
    }

    setRound(roundData);

    const resultsData = await getRoundResults(roundId);
    setResults(resultsData);

    setLoading(false);
  }

  function getRankDisplay(team) {
    if (!team.rank) return '-';

    const tieData = team.tie_breaker_data;
    if (tieData?.requires_manual_resolution) {
      return (
        <span className="rank-with-tie">
          {team.rank}
          <span className="tie-indicator" title="Tie - Manual resolution required">
            ⚠
          </span>
        </span>
      );
    }

    return team.rank;
  }

  function getPercentileColor(percentile) {
    if (percentile >= 80) return '#4caf50';
    if (percentile >= 60) return '#8bc34a';
    if (percentile >= 40) return '#ff9800';
    return '#f44336';
  }

  if (loading) {
    return (
      <div className="round-results">
        <div className="loading-spinner">Loading results...</div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="round-results">
        <div className="error-message">Round not found</div>
      </div>
    );
  }

  if (!round.is_computed) {
    return (
      <div className="round-results">
        <div className="info-message">
          This round has not been computed yet. Please ask an administrator to compute results.
        </div>
      </div>
    );
  }

  return (
    <div className="round-results">
      <div className="results-header">
        <div className="header-info">
          <h1>{round.events?.name} - {round.name} Results</h1>
          <div className="meta-info">
            <span>Computed: {new Date(round.computed_at).toLocaleString()}</span>
            <span className="separator">•</span>
            <span>Method: {round.normalization_method}</span>
            <span className="separator">•</span>
            <span>{results.length} teams</span>
          </div>
        </div>
        <div className="view-toggle">
          <button
            className={viewMode === 'summary' ? 'active' : ''}
            onClick={() => setViewMode('summary')}
          >
            Summary
          </button>
          <button
            className={viewMode === 'detailed' ? 'active' : ''}
            onClick={() => setViewMode('detailed')}
          >
            Detailed
          </button>
        </div>
      </div>

      {viewMode === 'summary' && (
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Category</th>
                <th>Percentile</th>
                <th>Aggregated Z</th>
                <th>Judges</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map(team => (
                <tr key={team.team_id} className={team.tie_breaker_data?.requires_manual_resolution ? 'has-tie' : ''}>
                  <td className="rank-cell">
                    {getRankDisplay(team)}
                  </td>
                  <td className="team-cell">
                    <strong>{team.team_name || team.team_id}</strong>
                  </td>
                  <td className="category-cell">
                    <span className={`category-badge ${team.team_category}`}>
                      {team.team_category}
                    </span>
                  </td>
                  <td className="percentile-cell">
                    <div className="percentile-bar-container">
                      <div
                        className="percentile-bar"
                        style={{
                          width: `${team.percentile}%`,
                          background: getPercentileColor(team.percentile)
                        }}
                      />
                      <span className="percentile-text">{team.percentile?.toFixed(2)}%</span>
                    </div>
                  </td>
                  <td className="z-score-cell">
                    {team.aggregated_z?.toFixed(4)}
                  </td>
                  <td className="judges-cell">
                    {team.judge_evaluations?.length || 0}
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => setSelectedTeam(team)}
                      className="btn-view-details"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'detailed' && (
        <div className="detailed-results">
          {results.map(team => (
            <div key={team.team_id} className="team-detail-card">
              <div className="team-detail-header">
                <div className="rank-badge">{team.rank}</div>
                <div className="team-detail-info">
                  <h3>{team.team_name || team.team_id}</h3>
                  <div className="team-scores">
                    <span className="score-item">
                      <span className="score-label">Percentile:</span>
                      <span className="score-value">{team.percentile?.toFixed(2)}%</span>
                    </span>
                    <span className="separator">•</span>
                    <span className="score-item">
                      <span className="score-label">Aggregated Z:</span>
                      <span className="score-value">{team.aggregated_z?.toFixed(4)}</span>
                    </span>
                  </div>
                </div>
                {team.tie_breaker_data?.requires_manual_resolution && (
                  <div className="tie-warning">
                    <span className="tie-icon">⚠</span>
                    <span>Tie - Manual resolution required</span>
                  </div>
                )}
              </div>

              <div className="judge-evaluations">
                <h4>Judge Evaluations</h4>
                <table className="judge-table">
                  <thead>
                    <tr>
                      <th>Judge</th>
                      <th>Category</th>
                      <th>Raw Total</th>
                      <th>Judge Mean (μ_j)</th>
                      <th>Judge Std (σ_j)</th>
                      <th>Z-Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.judge_evaluations?.map((judgeEval, idx) => (
                      <tr key={idx}>
                        <td>{judgeEval.judge_name || judgeEval.judge_id?.substring(0, 8)}</td>
                        <td>
                          <span className={`category-badge ${judgeEval.judge_category}`}>
                            {judgeEval.judge_category}
                          </span>
                        </td>
                        <td>{judgeEval.raw_total?.toFixed(2)}</td>
                        <td>{judgeEval.judge_mean?.toFixed(2)}</td>
                        <td>{judgeEval.judge_std?.toFixed(2)}</td>
                        <td className="z-score-value">{judgeEval.z_score?.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {team.tie_breaker_data && Object.keys(team.tie_breaker_data).length > 0 && (
                <div className="tie-breaker-info">
                  <h5>Tie-Breaking Data</h5>
                  <div className="tie-data-grid">
                    {team.tie_breaker_data.aggregated_z !== undefined && (
                      <div className="tie-data-item">
                        <span className="label">Aggregated Z:</span>
                        <span className="value">{team.tie_breaker_data.aggregated_z?.toFixed(4)}</span>
                      </div>
                    )}
                    {team.tie_breaker_data.mean_raw_total !== undefined && (
                      <div className="tie-data-item">
                        <span className="label">Mean Raw Total:</span>
                        <span className="value">{team.tie_breaker_data.mean_raw_total?.toFixed(2)}</span>
                      </div>
                    )}
                    {team.tie_breaker_data.median_raw_total !== undefined && (
                      <div className="tie-data-item">
                        <span className="label">Median Raw Total:</span>
                        <span className="value">{team.tie_breaker_data.median_raw_total?.toFixed(2)}</span>
                      </div>
                    )}
                    {team.tie_breaker_data.judge_count !== undefined && (
                      <div className="tie-data-item">
                        <span className="label">Judge Count:</span>
                        <span className="value">{team.tie_breaker_data.judge_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedTeam && (
        <div className="modal-overlay" onClick={() => setSelectedTeam(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTeam.team_name || selectedTeam.team_id}</h2>
              <button onClick={() => setSelectedTeam(null)} className="modal-close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-scores">
                <div className="modal-score-item">
                  <div className="modal-score-label">Rank</div>
                  <div className="modal-score-value">{selectedTeam.rank}</div>
                </div>
                <div className="modal-score-item">
                  <div className="modal-score-label">Percentile</div>
                  <div className="modal-score-value">{selectedTeam.percentile?.toFixed(2)}%</div>
                </div>
                <div className="modal-score-item">
                  <div className="modal-score-label">Aggregated Z</div>
                  <div className="modal-score-value">{selectedTeam.aggregated_z?.toFixed(4)}</div>
                </div>
              </div>

              <h3>Judge Evaluations</h3>
              <div className="modal-judge-list">
                {selectedTeam.judge_evaluations?.map((judgeEval, idx) => (
                  <div key={idx} className="modal-judge-card">
                    <div className="modal-judge-header">
                      <strong>{judgeEval.judge_name || 'Judge'}</strong>
                      <span className={`category-badge ${judgeEval.judge_category}`}>
                        {judgeEval.judge_category}
                      </span>
                    </div>
                    <div className="modal-judge-scores">
                      <div>Raw Total: <strong>{judgeEval.raw_total?.toFixed(2)}</strong></div>
                      <div>Z-Score: <strong>{judgeEval.z_score?.toFixed(4)}</strong></div>
                      <div>Judge Mean: {judgeEval.judge_mean?.toFixed(2)}</div>
                      <div>Judge Std: {judgeEval.judge_std?.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoundResults;
