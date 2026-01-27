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
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tabs,
  Tab,
} from "@mui/material";
import {
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AutoAwesome as AutoIcon,
} from "@mui/icons-material";
import { getRoundResults } from "../../services/computeRoundService";
import { 
  selectPerJudgeTopN, 
  selectGlobalTopK, 
  saveAndPromoteTeams,
  SelectionModes 
} from "../../services/selectionService";

function TeamSelectionPanel({ round, rounds, onClose, onRefresh }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectionMode, setSelectionMode] = useState(0); // 0 = manual, 1 = auto
  const [autoConfig, setAutoConfig] = useState({
    mode: SelectionModes.GLOBAL_TOP_K,
    topK: 10,
    topN: 5,
  });
  const [targetRound, setTargetRound] = useState("");
  const [autoPreview, setAutoPreview] = useState(null);

  const nextRounds = rounds.filter(r => r.round_number > round.round_number);

  useEffect(() => {
    loadResults();
  }, [round.id]);

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoundResults(round.id);
      setResults(data);
    } catch (err) {
      console.error("Error loading results:", err);
      setError("Failed to load results. Please compute results first.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTeam = (teamId) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTeams(results.map(r => r.team_id));
  };

  const handleClearSelection = () => {
    setSelectedTeams([]);
  };

  const handleAutoSelect = async () => {
    setSaving(true);
    setError(null);
    
    try {
      let result;
      
      if (autoConfig.mode === SelectionModes.GLOBAL_TOP_K) {
        result = await selectGlobalTopK(round.id, autoConfig.topK);
      } else {
        result = await selectPerJudgeTopN(round.id, autoConfig.topN);
      }

      if (result.success) {
        setSelectedTeams(result.selected);
        setAutoPreview(result);
        setSelectionMode(0); // Switch to manual to show selection
        setSuccess(`Auto-selected ${result.selected.length} teams`);
      } else {
        setError(result.error || "Auto-selection failed");
      }
    } catch (err) {
      console.error("Error in auto-selection:", err);
      setError(err.message || "Auto-selection failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteTeams = async () => {
    if (selectedTeams.length === 0) {
      setError("Please select at least one team to promote");
      return;
    }

    if (!targetRound) {
      setError("Please select a target round");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveAndPromoteTeams(
        round.id,
        targetRound,
        selectedTeams,
        autoConfig.mode,
        { topK: autoConfig.topK, topN: autoConfig.topN }
      );

      if (result.success) {
        setSuccess(`Successfully promoted ${result.promoted_count} teams to next round!`);
        onRefresh?.();
      } else {
        setError(result.error || "Failed to promote teams");
      }
    } catch (err) {
      console.error("Error promoting teams:", err);
      setError(err.message || "Failed to promote teams");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          Team Selection & Advancement - {round.name}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Select teams to advance to the next round
        </Typography>
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

        {!round.is_computed && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Results have not been computed yet. Please compute results before selecting teams.
          </Alert>
        )}

        <Tabs value={selectionMode} onChange={(e, v) => setSelectionMode(v)} sx={{ mb: 2 }}>
          <Tab label="Manual Selection" />
          <Tab label="Auto Selection" />
        </Tabs>

        {selectionMode === 1 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: '#f0f9ff' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Auto Selection Configuration
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Selection Mode</InputLabel>
                <Select
                  value={autoConfig.mode}
                  onChange={(e) => setAutoConfig({ ...autoConfig, mode: e.target.value })}
                  label="Selection Mode"
                >
                  <MenuItem value={SelectionModes.GLOBAL_TOP_K}>Global Top K</MenuItem>
                  <MenuItem value={SelectionModes.PER_JUDGE_TOP_N}>Per-Judge Top N</MenuItem>
                </Select>
              </FormControl>

              {autoConfig.mode === SelectionModes.GLOBAL_TOP_K ? (
                <TextField
                  type="number"
                  label="Top K Teams"
                  value={autoConfig.topK}
                  onChange={(e) => setAutoConfig({ ...autoConfig, topK: parseInt(e.target.value) || 10 })}
                  inputProps={{ min: 1, max: 100 }}
                  sx={{ width: 120 }}
                />
              ) : (
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Top N</InputLabel>
                  <Select
                    value={autoConfig.topN}
                    onChange={(e) => setAutoConfig({ ...autoConfig, topN: e.target.value })}
                    label="Top N"
                  >
                    <MenuItem value={2}>Top 2</MenuItem>
                    <MenuItem value={5}>Top 5</MenuItem>
                    <MenuItem value={10}>Top 10</MenuItem>
                  </Select>
                </FormControl>
              )}

              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <AutoIcon />}
                onClick={handleAutoSelect}
                disabled={saving || !round.is_computed}
              >
                Preview Selection
              </Button>
            </Box>

            {autoConfig.mode === SelectionModes.GLOBAL_TOP_K && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Selects the top {autoConfig.topK} teams based on their aggregated Z-scores across all judges.
              </Typography>
            )}

            {autoConfig.mode === SelectionModes.PER_JUDGE_TOP_N && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Each judge selects their top {autoConfig.topN} teams. Teams selected by multiple judges advance.
              </Typography>
            )}
          </Paper>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : results.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc' }}>
            <Typography color="textSecondary">
              No results available. Please compute round results first.
            </Typography>
          </Paper>
        ) : (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label={`${selectedTeams.length} selected`} 
                  color="primary" 
                  icon={<CheckCircleIcon />}
                />
                <Chip 
                  label={`${results.length} total`} 
                  variant="outlined" 
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button size="small" onClick={handleClearSelection}>
                  Clear
                </Button>
              </Box>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                      <Checkbox
                        indeterminate={selectedTeams.length > 0 && selectedTeams.length < results.length}
                        checked={selectedTeams.length === results.length}
                        onChange={(e) => e.target.checked ? handleSelectAll() : handleClearSelection()}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Team</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Percentile</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result) => {
                    const isSelected = selectedTeams.includes(result.team_id);
                    return (
                      <TableRow 
                        key={result.team_id}
                        selected={isSelected}
                        sx={{ 
                          cursor: 'pointer',
                          bgcolor: isSelected ? '#f0fdf4' : 'inherit'
                        }}
                        onClick={() => handleToggleTeam(result.team_id)}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={isSelected} />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={result.rank} 
                            size="small" 
                            color={result.rank <= 3 ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {result.team_name}
                        </TableCell>
                        <TableCell>
                          <Chip label={result.team_category || 'N/A'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          {result.percentile?.toFixed(0)}%
                        </TableCell>
                        <TableCell>
                          {isSelected ? (
                            <Chip 
                              icon={<CheckCircleIcon />} 
                              label="Selected" 
                              size="small" 
                              color="success" 
                            />
                          ) : (
                            <Chip 
                              icon={<CancelIcon />} 
                              label="Not Selected" 
                              size="small" 
                              variant="outlined" 
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Promotion Panel */}
            <Paper sx={{ p: 2, mt: 3, bgcolor: '#faf5ff' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Promote to Next Round
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Target Round</InputLabel>
                  <Select
                    value={targetRound}
                    onChange={(e) => setTargetRound(e.target.value)}
                    label="Target Round"
                  >
                    {nextRounds.map(r => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.name} (Round {r.round_number})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardIcon />}
                  onClick={handlePromoteTeams}
                  disabled={saving || selectedTeams.length === 0 || !targetRound}
                >
                  Promote {selectedTeams.length} Teams
                </Button>
              </Box>

              {nextRounds.length === 0 && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  No next round available. Create a new round to promote teams.
                </Typography>
              )}
            </Paper>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default TeamSelectionPanel;
