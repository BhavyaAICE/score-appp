import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  Calculate as CalculateIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
} from "@mui/icons-material";
import { computeRound, getRoundResults, checkRoundReadiness } from "../../services/computeRoundService";
import { exportRoundCSV, exportRoundPDF, downloadFile, downloadPDF } from '../../services/exportService';
import { importService } from '../../services/importService';
import { supabase } from '../../supabaseClient'; // Needed for manual import logic

function RoundResultsPanel({ round, onClose }) {
  const [results, setResults] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Import State
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importJudge, setImportJudge] = useState('');
  const [judges, setJudges] = useState([]);
  const [criteria, setCriteria] = useState([]);

  useEffect(() => {
    loadData();
    loadMetadata();
  }, [round.id]);

  const loadMetadata = async () => {
    // Load judges and criteria for Import functionality
    try {
      const { data: criteriaData } = await supabase.from('round_criteria').select('*').eq('round_id', round.id).order('display_order');
      setCriteria(criteriaData || []);

      const { data: assignments } = await supabase
        .from('round_judge_assignments')
        .select('judge_id, judges(id, name, email, category)')
        .eq('round_id', round.id);

      const judgeList = assignments?.map(a => ({
        id: a.judge_id,
        name: a.judges?.name,
        email: a.judges?.email,
        type: a.judge_type
      })) || [];
      setJudges(judgeList);
    } catch (e) {
      console.error("Error loading metadata", e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resultsData, readinessData] = await Promise.all([
        getRoundResults(round.id),
        checkRoundReadiness(round.id),
      ]);
      setResults(resultsData);
      setReadiness(readinessData);
    } catch (err) {
      console.error("Error loading round data:", err);
      setError("Failed to load round data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (format) => {
    try {
      setLoading(true);
      const result = await exportRoundCSV(round.id, { format });
      if (result.success) {
        downloadFile(result.csv, result.filename, 'text/csv');
        setSuccess('CSV downloaded successfully');
      } else {
        setError(`Export failed: ${result.error}`);
      }
    } catch (e) {
      setError(`Export failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportScores = async () => {
    if (!importJudge || !importText) {
      setError('Please select a judge and paste CSV content');
      return;
    }

    setLoading(true);
    try {
      const result = importService.parseCSV(importText, criteria);
      if (!result.success) throw new Error(result.error);

      let successCount = 0;

      // Compute raw total helper inline
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
        const rawTotal = computeRawTotal(item.scores);
        const evaluation = {
          round_id: round.id,
          judge_id: importJudge,
          team_id: item.team_id,
          scores: item.scores,
          raw_total: rawTotal,
          note: 'Imported via Admin',
          is_draft: false,
          submitted_at: new Date().toISOString(),
          version: 1
        };

        // Upsert
        const { data: existing } = await supabase.from('round_evaluations').select('id').eq('round_id', round.id).eq('judge_id', importJudge).eq('team_id', item.team_id).maybeSingle();

        let dbRes;
        if (existing) {
          dbRes = await supabase.from('round_evaluations').update(evaluation).eq('id', existing.id);
        } else {
          dbRes = await supabase.from('round_evaluations').insert(evaluation);
        }

        if (!dbRes.error) successCount++;
      }

      setSuccess(`Imported ${successCount} scores successfully.`);
      setShowImport(false);
      setImportText('');
      await loadData(); // Reload readiness
    } catch (e) {
      setError(`Import failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleComputeResults = async () => {
    setComputing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await computeRound(round.id, { method: 'Z_SCORE' });

      if (result.success) {
        setSuccess(`Results computed successfully! ${result.stats.teams_evaluated} teams evaluated by ${result.stats.judges_count} judges.`);
        await loadData();
      } else {
        setError(result.error || "Failed to compute results");
      }
    } catch (err) {
      console.error("Error computing results:", err);
      setError(err.message || "Failed to compute results");
    } finally {
      setComputing(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: "🥇", color: "#fbbf24" };
    if (rank === 2) return { icon: "🥈", color: "#9ca3af" };
    if (rank === 3) return { icon: "🥉", color: "#cd7f32" };
    return { icon: rank, color: "#6b7280" };
  };

  const getPercentileColor = (percentile) => {
    if (percentile >= 90) return "#22c55e";
    if (percentile >= 75) return "#3b82f6";
    if (percentile >= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrophyIcon sx={{ color: "#f59e0b" }} />
            Results - {round.name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {round.is_computed ? "Computed results" : "Results not yet computed"}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<ExportIcon />}
            onClick={() => handleExportCSV('raw')}
            disabled={loading}
          >
            Export Raw
          </Button>
          {round.is_computed && (
            <Button
              size="small"
              startIcon={<ExportIcon />}
              onClick={() => handleExportCSV('both')}
              disabled={loading}
              variant="outlined"
            >
              Export Full
            </Button>
          )}
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Readiness Check */}
            {readiness && (
              <Paper sx={{ p: 2, mb: 3, bgcolor: readiness.ready ? '#f0fdf4' : '#fef3c7' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Computation Readiness
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<ImportIcon />}
                    onClick={() => setShowImport(true)}
                    variant="outlined"
                    sx={{ bgcolor: 'white' }}
                  >
                    Import Scores (CSV)
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Chip
                    label={`${readiness.stats.criteria_count} criteria`}
                    size="small"
                    color={readiness.stats.criteria_count > 0 ? "success" : "error"}
                  />
                  <Chip
                    label={`${readiness.stats.judges_count} judges`}
                    size="small"
                    color={readiness.stats.judges_count > 0 ? "success" : "error"}
                  />
                  <Chip
                    label={`${readiness.stats.submitted_evaluations} submitted`}
                    size="small"
                    color={readiness.stats.submitted_evaluations > 0 ? "success" : "error"}
                  />
                  <Chip
                    label={`${readiness.stats.draft_evaluations} drafts`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                </Box>

                {!readiness.ready && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Cannot compute yet:</strong>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {readiness.missing.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                      Note: partial judge assignment is allowed, but at least one evaluation must be submitted.
                    </Typography>
                  </Alert>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={computing ? <CircularProgress size={18} color="inherit" /> : <CalculateIcon />}
                  onClick={handleComputeResults}
                  disabled={!readiness.ready || computing}
                >
                  {computing ? "Computing..." : round.is_computed ? "Recompute Results" : "Compute Results"}
                </Button>
              </Paper>
            )}

            {/* Results Table */}
            {results.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600, width: 80 }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Team</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 120 }}>Aggregated Z</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 120 }}>Percentile</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Judge Scores</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result) => {
                      const badge = getRankBadge(result.rank);
                      return (
                        <TableRow key={result.team_id}>
                          <TableCell>
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              fontWeight: result.rank <= 3 ? 700 : 400,
                              fontSize: result.rank <= 3 ? '1.2rem' : '1rem'
                            }}>
                              {typeof badge.icon === 'string' && badge.icon.length === 2 ? (
                                <span>{badge.icon}</span>
                              ) : (
                                <Chip label={badge.icon} size="small" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {result.team_name || 'Unknown Team'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={result.team_category || 'N/A'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Aggregated Z-Score across all judges">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingIcon fontSize="small" sx={{ color: result.aggregated_z >= 0 ? '#22c55e' : '#ef4444' }} />
                                {result.aggregated_z?.toFixed(3) || 'N/A'}
                              </Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={result.percentile || 0}
                                sx={{
                                  flex: 1,
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: '#e2e8f0',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: getPercentileColor(result.percentile)
                                  }
                                }}
                              />
                              <Typography variant="body2" sx={{ minWidth: 40 }}>
                                {result.percentile?.toFixed(0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {result.judge_evaluations?.map((evalItem, i) => (
                                <Tooltip
                                  key={i}
                                  title={`${evalItem.judge_name}: Raw ${evalItem.raw_total?.toFixed(1)}, Z-Score ${evalItem.z_score?.toFixed(3)}`}
                                >
                                  <Chip
                                    label={evalItem.raw_total?.toFixed(0)}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                </Tooltip>
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc' }}>
                <TrophyIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                <Typography color="textSecondary">
                  No results available yet. Make sure evaluations are submitted and then compute results.
                </Typography>
              </Paper>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Import Modal */}
      {showImport && (
        <Dialog open={showImport} onClose={() => setShowImport(false)} maxWidth="md" fullWidth>
          <DialogTitle>Import Scores from CSV</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" paragraph>
                Paste CSV data to import scores on behalf of a judge.
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Select Judge:</Typography>
                <select
                  value={importJudge}
                  onChange={(e) => setImportJudge(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Select Judge --</option>
                  {judges.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.name} ({j.email})
                    </option>
                  ))}
                </select>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">CSV Data:</Typography>
                  <Button
                    size="small"
                    onClick={() => setImportText(importService.generateTemplate(criteria))}
                  >
                    Load Template
                  </Button>
                </Box>
                <textarea
                  rows={10}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="TeamID, Score1, Score2..."
                  style={{ width: '100%', fontFamily: 'monospace', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={handleImportScores} variant="contained" disabled={loading}>
              Import Scores
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  );
}

export default RoundResultsPanel;
