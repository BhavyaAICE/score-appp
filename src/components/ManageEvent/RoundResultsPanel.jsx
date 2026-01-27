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
} from "@mui/icons-material";
import { computeRound, getRoundResults, checkRoundReadiness } from "../../services/computeRoundService";

function RoundResultsPanel({ round, onClose }) {
  const [results, setResults] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadData();
  }, [round.id]);

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
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Computation Readiness
                </Typography>
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
    </Dialog>
  );
}

export default RoundResultsPanel;
