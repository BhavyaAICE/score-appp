import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { computeRound, checkRoundReadiness } from '../services/computeRoundService';
import { executeSelection, SelectionModes } from '../services/selectionService';
import { executeSelection, SelectionModes } from '../services/selectionService';
import { exportRoundCSV, exportRoundPDF, downloadFile, downloadPDF } from '../services/exportService';
import { importService } from '../services/importService';
import './RoundManager.css';

function RoundManager({ eventId }) {
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [judges, setJudges] = useState([]);
  const [assignedJudges, setAssignedJudges] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Import State
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStats, setImportStats] = useState(null);
  const [importJudge, setImportJudge] = useState('');

  const [newCriterion, setNewCriterion] = useState({
    name: '',
    description: '',
    max_marks: 10,
    weight: 1.0
  });

  const [selectionConfig, setSelectionConfig] = useState({
    mode: SelectionModes.PER_JUDGE_TOP_N,
    topN: 5,
    topK: 10,
    judgeTypes: ['HARDWARE', 'SOFTWARE', 'BOTH'],
    createNextRound: true
  });

  useEffect(() => {
    if (eventId) {
      loadRounds();
      loadJudges();
    }
  }, [eventId]);

  useEffect(() => {
    if (selectedRound) {
      loadCriteria();
      loadAssignedJudges();
      checkReadiness();
    }
  }, [selectedRound]);

  async function loadRounds() {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('event_id', eventId)
      .order('round_number');

    if (error) {
      console.error('Error loading rounds:', error);
    } else {
      setRounds(data || []);
      if (data && data.length > 0 && !selectedRound) {
        setSelectedRound(data[0].id);
      }
    }
  }

  async function loadJudges() {
    const { data, error } = await supabase
      .from('judges')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error loading judges:', error);
    } else {
      setJudges(data || []);
    }
  }

  async function loadCriteria() {
    const { data, error } = await supabase
      .from('round_criteria')
      .select('*')
      .eq('round_id', selectedRound)
      .order('display_order');

    if (error) {
      console.error('Error loading criteria:', error);
    } else {
      setCriteria(data || []);
    }
  }

  async function loadAssignedJudges() {
    const { data, error } = await supabase
      .from('round_judge_assignments')
      .select(`
        *,
        judges (
          id,
          name,
          email,
          category
        )
      `)
      .eq('round_id', selectedRound);

    if (error) {
      console.error('Error loading assigned judges:', error);
    } else {
      setAssignedJudges(data || []);
    }
  }

  async function checkReadiness() {
    const result = await checkRoundReadiness(selectedRound);
    setReadiness(result);
  }

  async function createRound() {
    const roundNumber = rounds.length + 1;
    const { error } = await supabase
      .from('rounds')
      .insert({
        event_id: eventId,
        name: `Round ${roundNumber}`,
        round_number: roundNumber,
        status: 'draft'
      });

    if (error) {
      setMessage(`Error creating round: ${error.message}`);
    } else {
      setMessage('Round created successfully');
      loadRounds();
    }
  }

  async function addCriterion() {
    if (criteria.length >= 5) {
      setMessage('Maximum 5 criteria per round');
      return;
    }

    if (!newCriterion.name) {
      setMessage('Criterion name is required');
      return;
    }

    const { error } = await supabase
      .from('round_criteria')
      .insert({
        round_id: selectedRound,
        name: newCriterion.name,
        description: newCriterion.description,
        max_marks: parseFloat(newCriterion.max_marks),
        weight: parseFloat(newCriterion.weight),
        display_order: criteria.length
      });

    if (error) {
      setMessage(`Error adding criterion: ${error.message}`);
    } else {
      setMessage('Criterion added successfully');
      setNewCriterion({ name: '', description: '', max_marks: 10, weight: 1.0 });
      loadCriteria();
      checkReadiness();
    }
  }

  async function deleteCriterion(criterionId) {
    const { error } = await supabase
      .from('round_criteria')
      .delete()
      .eq('id', criterionId);

    if (error) {
      setMessage(`Error deleting criterion: ${error.message}`);
    } else {
      setMessage('Criterion deleted');
      loadCriteria();
      checkReadiness();
    }
  }

  async function assignJudge(judgeId, judgeType) {
    const { error } = await supabase
      .from('round_judge_assignments')
      .insert({
        round_id: selectedRound,
        judge_id: judgeId,
        judge_type: judgeType,
        judge_weight: 1.0
      });

    if (error) {
      setMessage(`Error assigning judge: ${error.message}`);
    } else {
      setMessage('Judge assigned successfully');
      loadAssignedJudges();
      checkReadiness();
    }
  }

  async function unassignJudge(assignmentId) {
    const { error } = await supabase
      .from('round_judge_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      setMessage(`Error unassigning judge: ${error.message}`);
    } else {
      setMessage('Judge unassigned');
      loadAssignedJudges();
      checkReadiness();
    }
  }

  async function handleComputeRound() {
    setLoading(true);
    setMessage('Computing round...');

    const result = await computeRound(selectedRound, {
      method: 'Z_SCORE',
      computedBy: null
    });

    setLoading(false);

    if (result.success) {
      setMessage(`Round computed successfully! ${result.stats.teams_evaluated} teams, ${result.stats.judges_count} judges`);
      loadRounds();
      checkReadiness();
    } else {
      setMessage(`Error: ${result.error}`);
    }
  }

  async function handleSelectTeams() {
    setLoading(true);
    setMessage('Selecting teams...');

    const result = await executeSelection(selectedRound, selectionConfig);

    setLoading(false);

    if (result.success) {
      if (result.stop) {
        setMessage(result.message);
      } else {
        setMessage(`Selection complete! ${result.selected.length} teams selected`);
        loadRounds();
      }
    } else {
      setMessage(`Error: ${result.error}`);
    }
  }

  async function handleExportCSV(format) {
    setLoading(true);
    const result = await exportRoundCSV(selectedRound, { format });
    setLoading(false);

    if (result.success) {
      downloadFile(result.csv, result.filename, 'text/csv');
      setMessage('CSV downloaded');
    } else {
      setMessage(`Error: ${result.error}`);
    }
  }

  async function handleExportPDF() {
    setLoading(true);
    const result = await exportRoundPDF(selectedRound);
    setLoading(false);

    if (result.success) {
      downloadPDF(result.pdf, result.filename);
      setMessage('PDF downloaded');
    }
  }

  async function handleImportScores() {
    if (!importJudge) {
      setMessage('Please select a judge for import');
      return;
    }

    if (!importText) {
      setMessage('Please paste CSV content');
      return;
    }

    setLoading(true);
    const result = importService.parseCSV(importText, criteria);
    setLoading(false);

    if (!result.success) {
      setMessage(`Parse Error: ${result.error}`);
      return;
    }

    setImportStats(result.stats);

    if (window.confirm(`Parsed ${result.data.length} scores. Import them for user ${assignedJudges.find(j => j.judge_id === importJudge)?.judges?.name}?`)) {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      const computeRawTotal = (scores) => {
        let total = 0;
        let weightSum = 0;
        criteria.forEach(c => {
          const score = scores[c.id] || 0;
          total += (score / c.max_marks) * c.weight;
          weightSum += c.weight;
        });
        return weightSum > 0 ? (total / weightSum) * 100 : 0;
      };

      for (const item of result.data) {
        // Save to DB
        // We need component to be cleaner, maybe move this logic to service? 
        // For now, implementing inline to save time as requested.

        const rawTotal = computeRawTotal(item.scores);

        const evaluation = {
          round_id: selectedRound,
          judge_id: importJudge,
          team_id: item.team_id,
          scores: item.scores,
          raw_total: rawTotal,
          note: 'Imported via Admin',
          is_draft: false,
          submitted_at: new Date().toISOString(),
          version: 1
        };

        // Upsert based on Team + Judge + Round
        // First get existing ID if any
        const { data: existing } = await supabase
          .from('round_evaluations')
          .select('id')
          .eq('round_id', selectedRound)
          .eq('judge_id', importJudge)
          .eq('team_id', item.team_id)
          .maybeSingle();

        let dbRes;
        if (existing) {
          dbRes = await supabase.from('round_evaluations').update(evaluation).eq('id', existing.id);
        } else {
          dbRes = await supabase.from('round_evaluations').insert(evaluation);
        }

        if (dbRes.error) errorCount++;
        else successCount++;
      }

      setLoading(false);
      setMessage(`Import complete. Success: ${successCount}, Errors: ${errorCount}`);
      setShowImport(false);
      setImportText('');
      setImportStats(null);
      checkReadiness();
    }
  }

  const currentRound = rounds.find(r => r.id === selectedRound);
  const unassignedJudges = judges.filter(
    judge => !assignedJudges.some(aj => aj.judge_id === judge.id)
  );

  return (
    <div className="round-manager">
      <h1>Round Management</h1>

      {message && (
        <div className="message-banner">
          {message}
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      <div className="rounds-header">
        <div className="rounds-tabs">
          {rounds.map(round => (
            <button
              key={round.id}
              className={`round-tab ${selectedRound === round.id ? 'active' : ''}`}
              onClick={() => setSelectedRound(round.id)}
            >
              {round.name}
              {round.is_computed && <span className="badge">✓</span>}
            </button>
          ))}
        </div>
        <button onClick={createRound} className="btn-primary">
          + Create Round
        </button>
      </div>

      {currentRound && (
        <div className="round-details">
          <div className="round-info">
            <h2>{currentRound.name}</h2>
            <div className="round-status">
              <span className={`status-badge ${currentRound.status}`}>
                {currentRound.status}
              </span>
              {currentRound.is_computed && (
                <span className="computed-badge">
                  Computed: {new Date(currentRound.computed_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {readiness && (
            <div className={`readiness-panel ${readiness.ready ? 'ready' : 'not-ready'}`}>
              <h3>Round Readiness</h3>
              <div className="stats">
                <div className="stat">
                  <span className="label">Criteria:</span>
                  <span className="value">{readiness.stats.criteria_count}/5</span>
                </div>
                <div className="stat">
                  <span className="label">Judges:</span>
                  <span className="value">{readiness.stats.judges_count}</span>
                </div>
                <div className="stat">
                  <span className="label">Submitted:</span>
                  <span className="value">{readiness.stats.submitted_evaluations}</span>
                </div>
                <div className="stat">
                  <span className="label">Drafts:</span>
                  <span className="value">{readiness.stats.draft_evaluations}</span>
                </div>
              </div>
              {!readiness.ready && readiness.missing.length > 0 && (
                <div className="missing-items">
                  <strong>Missing:</strong>
                  <ul>
                    {readiness.missing.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="sections">
            <section className="criteria-section">
              <h3>Criteria (Max 5)</h3>
              <div className="criteria-list">
                {criteria.map(criterion => (
                  <div key={criterion.id} className="criterion-card">
                    <div className="criterion-info">
                      <h4>{criterion.name}</h4>
                      <p>{criterion.description}</p>
                      <div className="criterion-meta">
                        <span>Max: {criterion.max_marks}</span>
                        <span>Weight: {criterion.weight}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCriterion(criterion.id)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {criteria.length < 5 && (
                <div className="add-criterion-form">
                  <h4>Add Criterion</h4>
                  <div className="form-grid">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newCriterion.name}
                      onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newCriterion.description}
                      onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Max Marks"
                      value={newCriterion.max_marks}
                      onChange={(e) => setNewCriterion({ ...newCriterion, max_marks: e.target.value })}
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Weight"
                      value={newCriterion.weight}
                      onChange={(e) => setNewCriterion({ ...newCriterion, weight: e.target.value })}
                    />
                  </div>
                  <button onClick={addCriterion} className="btn-primary">
                    Add Criterion
                  </button>
                </div>
              )}
            </section>

            <section className="judges-section">
              <h3>Assigned Judges</h3>
              <div className="judges-list">
                {assignedJudges.map(assignment => (
                  <div key={assignment.id} className="judge-card">
                    <div className="judge-info">
                      <h4>{assignment.judges?.name}</h4>
                      <p>{assignment.judges?.email}</p>
                      <span className="judge-type-badge">{assignment.judge_type}</span>
                    </div>
                    <button
                      onClick={() => unassignJudge(assignment.id)}
                      className="btn-delete"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {unassignedJudges.length > 0 && (
                <div className="assign-judge-form">
                  <h4>Assign Judge</h4>
                  {unassignedJudges.map(judge => (
                    <div key={judge.id} className="assign-judge-row">
                      <span>{judge.name} ({judge.email})</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignJudge(judge.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Assign as...</option>
                        <option value="HARDWARE">Hardware</option>
                        <option value="SOFTWARE">Software</option>
                        <option value="BOTH">Both</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="actions-panel">
            <div className="compute-section">
              <h3>Compute Results</h3>
              <button
                onClick={handleComputeRound}
                disabled={!readiness?.ready || loading}
                className="btn-primary btn-large"
              >
                {loading ? 'Computing...' : 'Compute Round'}
              </button>
            </div>

            {currentRound.is_computed && (
              <>
                <div className="selection-section">
                  <h3>Team Selection</h3>
                  <div className="selection-config">
                    <label>
                      Mode:
                      <select
                        value={selectionConfig.mode}
                        onChange={(e) => setSelectionConfig({ ...selectionConfig, mode: e.target.value })}
                      >
                        <option value={SelectionModes.PER_JUDGE_TOP_N}>Per-Judge Top N</option>
                        <option value={SelectionModes.GLOBAL_TOP_K}>Global Top K</option>
                      </select>
                    </label>

                    {selectionConfig.mode === SelectionModes.PER_JUDGE_TOP_N && (
                      <label>
                        Top N:
                        <select
                          value={selectionConfig.topN}
                          onChange={(e) => setSelectionConfig({ ...selectionConfig, topN: parseInt(e.target.value) })}
                        >
                          <option value={2}>2</option>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                        </select>
                      </label>
                    )}

                    {selectionConfig.mode === SelectionModes.GLOBAL_TOP_K && (
                      <label>
                        Top K:
                        <input
                          type="number"
                          value={selectionConfig.topK}
                          onChange={(e) => setSelectionConfig({ ...selectionConfig, topK: parseInt(e.target.value) })}
                        />
                      </label>
                    )}

                    <label>
                      <input
                        type="checkbox"
                        checked={selectionConfig.createNextRound}
                        onChange={(e) => setSelectionConfig({ ...selectionConfig, createNextRound: e.target.checked })}
                      />
                      Create Next Round
                    </label>
                  </div>
                  <button
                    onClick={handleSelectTeams}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Selecting...' : 'Select Teams'}
                  </button>
                </div>

                <div className="export-section">
                  <h3>Export Results</h3>
                  <div className="export-buttons">
                    <button
                      onClick={() => handleExportCSV('both')}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      Export CSV (Full)
                    </button>
                    <button
                      onClick={() => handleExportCSV('raw')}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      Export CSV (Raw)
                    </button>
                    <button
                      onClick={() => handleExportCSV('normalized')}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      Export CSV (Normalized)
                    </button>
                    <button
                      onClick={handleExportPDF}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>

                <div className="import-section">
                  <h3>Import Scores</h3>
                  <p>Upload/Paste scores on behalf of offline judges.</p>
                  <button onClick={() => setShowImport(true)} className="btn-secondary">
                    Import Scores
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {
        showImport && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Import Judge Scores</h3>
              <div className="form-group">
                <label>Select Judge (to import on behalf of):</label>
                <select value={importJudge} onChange={(e) => setImportJudge(e.target.value)}>
                  <option value="">-- Select Judge --</option>
                  {assignedJudges.map(aj => (
                    <option key={aj.judge_id} value={aj.judge_id}>
                      {aj.judges?.name} ({aj.judge_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Paste CSV Data:</label>
                <p className="hint">Format: Team ID, [Criteria Name 1], [Criteria Name 2]...</p>
                <textarea
                  rows={10}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={importService.generateTemplate(criteria)}
                  style={{ width: '100%', fontFamily: 'monospace' }}
                />
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => {
                    const template = importService.generateTemplate(criteria);
                    setImportText(template);
                  }}
                  className="btn-secondary"
                >
                  Load Template Header
                </button>
                <div style={{ flex: 1 }}></div>
                <button onClick={() => setShowImport(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleImportScores} disabled={loading} className="btn-primary">
                  {loading ? 'Importing...' : 'Parse & Import'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default RoundManager;
