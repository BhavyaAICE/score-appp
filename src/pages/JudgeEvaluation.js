import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { computeRawTotal } from '../services/normalizationService';
import './JudgeEvaluation.css';

function JudgeEvaluation({ judgeId, roundId }) {
  const [round, setRound] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [teams, setTeams] = useState([]);
  const [evaluations, setEvaluations] = useState({});
  const [currentTeam, setCurrentTeam] = useState(null);
  const [scores, setScores] = useState({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isDraft, setIsDraft] = useState(true);

  useEffect(() => {
    if (judgeId && roundId) {
      loadRoundData();
    }
  }, [judgeId, roundId]);

  useEffect(() => {
    if (currentTeam) {
      loadEvaluation(currentTeam.id);
    }
  }, [currentTeam]);

  async function loadRoundData() {
    const { data: roundData, error: roundError } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .maybeSingle();

    if (roundError) {
      console.error('Error loading round:', roundError);
      return;
    }

    setRound(roundData);

    const { data: criteriaData, error: criteriaError } = await supabase
      .from('round_criteria')
      .select('*')
      .eq('round_id', roundId)
      .order('display_order');

    if (criteriaError) {
      console.error('Error loading criteria:', criteriaError);
      return;
    }

    setCriteria(criteriaData || []);

    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('event_id', roundData.event_id);

    if (teamsError) {
      console.error('Error loading teams:', teamsError);
      return;
    }

    setTeams(teamsData || []);
    if (teamsData && teamsData.length > 0) {
      setCurrentTeam(teamsData[0]);
    }

    const { data: evalsData, error: evalsError } = await supabase
      .from('round_evaluations')
      .select('*')
      .eq('round_id', roundId)
      .eq('judge_id', judgeId);

    if (evalsError) {
      console.error('Error loading evaluations:', evalsError);
      return;
    }

    const evalsMap = {};
    evalsData?.forEach(evaluation => {
      evalsMap[evaluation.team_id] = evaluation;
    });
    setEvaluations(evalsMap);
  }

  async function loadEvaluation(teamId) {
    const existingEval = evaluations[teamId];

    if (existingEval) {
      setScores(existingEval.scores || {});
      setNote(existingEval.note || '');
      setIsDraft(existingEval.is_draft);
    } else {
      const initialScores = {};
      criteria.forEach(criterion => {
        initialScores[criterion.id] = '';
      });
      setScores(initialScores);
      setNote('');
      setIsDraft(true);
    }
  }

  function handleScoreChange(criterionId, value) {
    const criterion = criteria.find(c => c.id === criterionId);
    const numValue = parseFloat(value);

    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= criterion.max_marks)) {
      setScores({
        ...scores,
        [criterionId]: value === '' ? '' : numValue
      });
    }
  }

  function validateScores() {
    const missing = [];

    criteria.forEach(criterion => {
      if (scores[criterion.id] === '' || scores[criterion.id] === undefined) {
        missing.push(criterion.name);
      }
    });

    return missing;
  }

  async function saveEvaluation(submit = false) {
    if (submit) {
      const missing = validateScores();
      if (missing.length > 0) {
        setMessage(`Missing scores for: ${missing.join(', ')}`);
        return;
      }
    }

    setLoading(true);

    const cleanScores = {};
    Object.entries(scores).forEach(([criterionId, value]) => {
      if (value !== '' && value !== undefined) {
        cleanScores[criterionId] = value;
      }
    });

    const rawTotal = computeRawTotal({ scores: cleanScores }, criteria);

    const evaluation = {
      round_id: roundId,
      judge_id: judgeId,
      team_id: currentTeam.id,
      scores: cleanScores,
      raw_total: rawTotal,
      note: note,
      is_draft: !submit,
      submitted_at: submit ? new Date().toISOString() : null,
      version: 1
    };

    const existingEval = evaluations[currentTeam.id];

    let result;
    if (existingEval && existingEval.is_draft) {
      result = await supabase
        .from('round_evaluations')
        .update(evaluation)
        .eq('id', existingEval.id);
    } else if (!existingEval) {
      result = await supabase
        .from('round_evaluations')
        .insert(evaluation);
    } else {
      setLoading(false);
      setMessage('Cannot edit submitted evaluation');
      return;
    }

    setLoading(false);

    if (result.error) {
      setMessage(`Error: ${result.error.message}`);
    } else {
      setMessage(submit ? 'Evaluation submitted successfully!' : 'Draft saved');
      setEvaluations({
        ...evaluations,
        [currentTeam.id]: { ...evaluation, id: existingEval?.id }
      });

      if (submit) {
        const currentIndex = teams.findIndex(t => t.id === currentTeam.id);
        if (currentIndex < teams.length - 1) {
          setCurrentTeam(teams[currentIndex + 1]);
        }
      }
    }
  }

  const currentEval = evaluations[currentTeam?.id];
  const isSubmitted = currentEval && !currentEval.is_draft;
  const completedCount = Object.values(evaluations).filter(e => !e.is_draft).length;
  const totalCount = teams.length;

  const computedRawTotal = computeRawTotal({ scores }, criteria);

  return (
    <div className="judge-evaluation">
      <div className="evaluation-header">
        <div className="header-info">
          <h1>Judge Evaluation</h1>
          <p className="round-name">{round?.name}</p>
        </div>
        <div className="progress-info">
          <div className="progress-text">
            {completedCount} / {totalCount} teams evaluated
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {message && (
        <div className="message-banner">
          {message}
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      <div className="evaluation-container">
        <div className="team-selector">
          <h3>Teams</h3>
          <div className="team-list">
            {teams.map(team => {
              const teamEval = evaluations[team.id];
              const status = teamEval
                ? teamEval.is_draft
                  ? 'draft'
                  : 'submitted'
                : 'pending';

              return (
                <button
                  key={team.id}
                  className={`team-item ${currentTeam?.id === team.id ? 'active' : ''} ${status}`}
                  onClick={() => setCurrentTeam(team)}
                >
                  <span className="team-name">{team.name}</span>
                  <span className={`status-dot ${status}`} title={status} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="evaluation-form">
          {currentTeam && (
            <>
              <div className="team-header">
                <div>
                  <h2>{currentTeam.name}</h2>
                  {currentTeam.project_title && (
                    <p className="project-title">{currentTeam.project_title}</p>
                  )}
                  {currentTeam.project_description && (
                    <p className="project-description">{currentTeam.project_description}</p>
                  )}
                </div>
                {isSubmitted && (
                  <div className="submitted-badge">
                    ✓ Submitted
                  </div>
                )}
              </div>

              <div className="criteria-scoring">
                {criteria.map(criterion => (
                  <div key={criterion.id} className="criterion-row">
                    <div className="criterion-info-col">
                      <div className="criterion-name">{criterion.name}</div>
                      <div className="criterion-description">{criterion.description}</div>
                      <div className="criterion-meta">
                        Max: {criterion.max_marks} | Weight: {criterion.weight}
                      </div>
                    </div>
                    <div className="criterion-input-col">
                      <input
                        type="number"
                        min="0"
                        max={criterion.max_marks}
                        step="0.5"
                        value={scores[criterion.id] || ''}
                        onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                        disabled={isSubmitted}
                        placeholder="0"
                        className="score-input"
                      />
                      <span className="max-marks">/ {criterion.max_marks}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="computed-total">
                <span className="label">Computed Raw Total:</span>
                <span className="value">{computedRawTotal.toFixed(2)} / 100</span>
              </div>

              <div className="note-section">
                <label>Notes (Optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isSubmitted}
                  placeholder="Add any notes about this evaluation..."
                  rows={4}
                />
              </div>

              <div className="action-buttons">
                {!isSubmitted && (
                  <>
                    <button
                      onClick={() => saveEvaluation(false)}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      {loading ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                      onClick={() => saveEvaluation(true)}
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? 'Submitting...' : 'Submit Evaluation'}
                    </button>
                  </>
                )}
                {isSubmitted && (
                  <div className="submitted-message">
                    This evaluation has been submitted and cannot be edited.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default JudgeEvaluation;
