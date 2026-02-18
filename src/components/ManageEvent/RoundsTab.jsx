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
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Check as CheckIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  EmojiEvents as TrophyIcon,
  ArrowForward as ArrowForwardIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { eventService } from "../../services/eventService";
import { roundService } from "../../services/roundService";
import RoundCriteriaManager from "./RoundCriteriaManager";
import RoundResultsPanel from "./RoundResultsPanel";
import TeamSelectionPanel from "./TeamSelectionPanel";
import JudgeProgressDashboard from "./JudgeProgressDashboard";

const ROUND_STATUS_COLORS = {
  draft: "default",
  active: "success",
  closed: "warning",
  completed: "info",
};

const ROUND_STATUS_LABELS = {
  draft: "Draft",
  active: "Active (Judging)",
  closed: "Closed",
  completed: "Completed",
};

function RoundsTab({ rounds, onRoundsChange, eventId, judges = [], teams = [] }) {
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [currentRound, setCurrentRound] = useState({
    name: "",
    round_number: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRound, setExpandedRound] = useState(null);
  const [roundJudges, setRoundJudges] = useState({});
  const [selectedRoundForAssign, setSelectedRoundForAssign] = useState(null);
  const [selectedJudges, setSelectedJudges] = useState([]);
  const [roundTeamAssignments, setRoundTeamAssignments] = useState({});
  const [criteriaRound, setCriteriaRound] = useState(null);
  const [resultsRound, setResultsRound] = useState(null);
  const [selectionRound, setSelectionRound] = useState(null);
  const [progressRound, setProgressRound] = useState(null);
  const [roundCriteriaCounts, setRoundCriteriaCounts] = useState({});

  // Load judge assignments and criteria counts for all rounds
  useEffect(() => {
    const loadRoundAssignments = async () => {
      const judgeAssignments = {};
      const teamAssignments = {};
      const criteriaCounts = {};

      for (const round of rounds) {
        try {
          const judgeData = await roundService.getRoundJudgeAssignments(round.id);
          judgeAssignments[round.id] = judgeData;

          const teamData = await roundService.getJudgeTeamAssignmentsForRound(round.id);
          teamAssignments[round.id] = teamData;

          const criteriaData = await roundService.getRoundCriteria(round.id);
          criteriaCounts[round.id] = criteriaData.length;
        } catch (err) {
          console.error(`Error loading assignments for round ${round.id}:`, err);
        }
      }

      setRoundJudges(judgeAssignments);
      setRoundTeamAssignments(teamAssignments);
      setRoundCriteriaCounts(criteriaCounts);
    };

    if (rounds.length > 0) {
      loadRoundAssignments();
    }
  }, [rounds]);

  const handleAddRound = () => {
    setCurrentRound({ name: "", round_number: rounds.length + 1 });
    setError(null);
    setOpenDialog(true);
  };

  const handleSaveRound = async () => {
    if (!currentRound.name) {
      setError("Round name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (currentRound.id) {
        const updated = await eventService.updateRound(currentRound.id, {
          name: currentRound.name,
          round_number: currentRound.round_number || 1,
        });
        const updatedRounds = rounds.map((r) =>
          r.id === currentRound.id ? updated : r
        );
        updatedRounds.sort((a, b) => a.round_number - b.round_number);
        onRoundsChange(updatedRounds);
      } else {
        const newRound = await eventService.createRound({
          event_id: eventId,
          name: currentRound.name,
          round_number: currentRound.round_number || rounds.length + 1,
          status: 'draft',
        });
        const updatedRounds = [...rounds, newRound];
        updatedRounds.sort((a, b) => a.round_number - b.round_number);
        onRoundsChange(updatedRounds);
      }
      setOpenDialog(false);
    } catch (err) {
      console.error("Error saving round:", err);
      setError(err.message || "Failed to save round");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRound = async (roundId) => {
    if (window.confirm("Are you sure you want to delete this round? All evaluations and assignments will be lost.")) {
      setLoading(true);
      try {
        await eventService.deleteRound(roundId);
        onRoundsChange(rounds.filter((r) => r.id !== roundId));
      } catch (err) {
        console.error("Error deleting round:", err);
        setError(err.message || "Failed to delete round");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStatusChange = async (roundId, newStatus) => {
    setLoading(true);
    try {
      const updated = await roundService.updateRoundStatus(roundId, newStatus);
      const updatedRounds = rounds.map((r) =>
        r.id === roundId ? { ...r, status: newStatus } : r
      );
      onRoundsChange(updatedRounds);
    } catch (err) {
      console.error("Error updating round status:", err);
      setError(err.message || "Failed to update round status");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignDialog = (round) => {
    setSelectedRoundForAssign(round);
    const currentAssignments = roundJudges[round.id] || [];
    setSelectedJudges(currentAssignments.map(a => a.judge_id));
    setOpenAssignDialog(true);
  };

  const handleSaveJudgeAssignments = async () => {
    if (!selectedRoundForAssign) return;

    setLoading(true);
    try {
      await roundService.setRoundJudges(selectedRoundForAssign.id, selectedJudges);

      // Reload assignments
      const judgeData = await roundService.getRoundJudgeAssignments(selectedRoundForAssign.id);
      setRoundJudges(prev => ({
        ...prev,
        [selectedRoundForAssign.id]: judgeData
      }));

      setOpenAssignDialog(false);
      setSelectedRoundForAssign(null);
    } catch (err) {
      console.error("Error saving judge assignments:", err);
      setError(err.message || "Failed to save judge assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssignTeams = async (roundId) => {
    const roundJudgeList = (roundJudges[roundId] || []).map(a => a.judge);

    if (roundJudgeList.length === 0) {
      alert("Please assign judges to this round first.");
      return;
    }

    if (teams.length === 0) {
      alert("No teams available to assign.");
      return;
    }

    setLoading(true);
    try {
      await roundService.autoAssignJudgesToRound(roundId, roundJudgeList, teams);

      // Reload team assignments
      const teamData = await roundService.getJudgeTeamAssignmentsForRound(roundId);
      setRoundTeamAssignments(prev => ({
        ...prev,
        [roundId]: teamData
      }));

      alert("Teams have been auto-assigned to judges for this round!");
    } catch (err) {
      console.error("Error auto-assigning teams:", err);
      setError(err.message || "Failed to auto-assign teams");
    } finally {
      setLoading(false);
    }
  };

  const getStatusActions = (round) => {
    const status = round.status || 'draft';

    switch (status) {
      case 'draft':
        return (
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<PlayArrowIcon />}
            onClick={() => handleStatusChange(round.id, 'active')}
            disabled={loading}
          >
            Start Judging
          </Button>
        );
      case 'active':
        return (
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<StopIcon />}
            onClick={() => handleStatusChange(round.id, 'closed')}
            disabled={loading}
          >
            Close Round
          </Button>
        );
      case 'closed':
        return (
          <Button
            size="small"
            variant="contained"
            color="info"
            startIcon={<CheckIcon />}
            onClick={() => handleStatusChange(round.id, 'completed')}
            disabled={loading}
          >
            Mark Complete
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddRound}
          disabled={loading}
        >
          Create Round
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip label={`${rounds.length} Rounds`} color="primary" />
          <Chip label={`${judges.length} Judges Available`} variant="outlined" />
          <Chip label={`${teams.length} Teams`} variant="outlined" />
        </Box>
      </Box>

      {rounds.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
          <Typography color="textSecondary">
            No rounds created yet. Click "Create Round" to get started.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rounds.map((round) => {
            const assignedJudges = roundJudges[round.id] || [];
            const teamAssignments = roundTeamAssignments[round.id] || [];
            const uniqueTeamsAssigned = new Set(teamAssignments.map(a => a.team_id)).size;

            return (
              <Accordion
                key={round.id}
                expanded={expandedRound === round.id}
                onChange={() => setExpandedRound(expandedRound === round.id ? null : round.id)}
                sx={{
                  borderRadius: '12px !important',
                  '&:before': { display: 'none' },
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                    <Typography sx={{ fontWeight: 700, minWidth: '40px' }}>
                      #{round.round_number}
                    </Typography>
                    <Typography sx={{ fontWeight: 600, flex: 1 }}>
                      {round.name}
                    </Typography>
                    <Chip
                      label={ROUND_STATUS_LABELS[round.status] || 'Draft'}
                      color={ROUND_STATUS_COLORS[round.status] || 'default'}
                      size="small"
                    />
                    <Chip
                      icon={<PeopleIcon />}
                      label={`${assignedJudges.length} judges`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<AssignmentIcon />}
                      label={`${uniqueTeamsAssigned}/${teams.length} teams`}
                      size="small"
                      variant="outlined"
                      color={uniqueTeamsAssigned === teams.length ? 'success' : 'default'}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    {getStatusActions(round)}

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<SettingsIcon />}
                      onClick={() => setCriteriaRound(round)}
                      disabled={loading}
                    >
                      Criteria ({roundCriteriaCounts[round.id] || 0})
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PeopleIcon />}
                      onClick={() => handleOpenAssignDialog(round)}
                      disabled={loading || round.status === 'completed'}
                    >
                      Assign Judges
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<AssignmentIcon />}
                      onClick={() => handleAutoAssignTeams(round.id)}
                      disabled={loading || assignedJudges.length === 0 || round.status === 'completed'}
                    >
                      Auto-Assign Teams
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="info"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setProgressRound(round)}
                      disabled={loading || assignedJudges.length === 0}
                    >
                      Judge Progress
                    </Button>

                    {(round.status === 'closed' || round.status === 'completed') && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<TrophyIcon />}
                          onClick={() => setResultsRound(round)}
                          disabled={loading}
                        >
                          Results
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          startIcon={<ArrowForwardIcon />}
                          onClick={() => setSelectionRound(round)}
                          disabled={loading}
                        >
                          Advance Teams
                        </Button>
                      </>
                    )}

                    <IconButton
                      size="small"
                      onClick={() => {
                        setCurrentRound({
                          id: round.id,
                          name: round.name,
                          round_number: round.round_number,
                        });
                        setError(null);
                        setOpenDialog(true);
                      }}
                      disabled={loading || round.status === 'completed'}
                      sx={{ color: "#3b82f6" }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRound(round.id)}
                      disabled={loading || round.status === 'active'}
                      sx={{ color: "#ef4444" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Assigned Judges */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Assigned Judges ({assignedJudges.length})
                  </Typography>

                  {assignedJudges.length === 0 ? (
                    <Typography color="textSecondary" sx={{ mb: 2, fontSize: '0.875rem' }}>
                      No judges assigned yet. Click "Assign Judges" to add judges to this round.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {assignedJudges.map((assignment) => {
                        const judgeTeams = teamAssignments.filter(ta => ta.judge_id === assignment.judge_id);
                        return (
                          <Chip
                            key={assignment.judge_id}
                            label={`${assignment.judge?.name || 'Unknown'} (${judgeTeams.length} teams)`}
                            size="small"
                            color={judgeTeams.length > 0 ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        );
                      })}
                    </Box>
                  )}

                  {/* Team Assignment Summary */}
                  {teamAssignments.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Team Assignments
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Judge</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Team</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {teamAssignments.map((assignment) => (
                              <TableRow key={assignment.id}>
                                <TableCell>{assignment.judge?.name || 'Unknown'}</TableCell>
                                <TableCell>{assignment.team?.name || 'Unknown'}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={assignment.team?.category_id || 'N/A'}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Create/Edit Round Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{currentRound.id ? "Edit Round" : "Create New Round"}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Round Name"
            value={currentRound.name}
            onChange={(e) => setCurrentRound({ ...currentRound, name: e.target.value })}
            margin="normal"
            required
            placeholder="e.g., Round 1, Semi-Finals, Finals"
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Order"
            type="number"
            value={currentRound.round_number}
            onChange={(e) => setCurrentRound({ ...currentRound, round_number: parseInt(e.target.value) })}
            margin="normal"
            required
            disabled={loading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveRound}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : (currentRound.id ? "Update" : "Create")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Judges Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Judges to {selectedRoundForAssign?.name}
        </DialogTitle>
        <DialogContent>
          <Typography color="textSecondary" sx={{ mb: 2 }}>
            Select judges to participate in this round. Only assigned judges can submit evaluations.
          </Typography>

          <FormControl fullWidth>
            <Select
            multiple
            value={selectedJudges}
            onChange={(e) => {
              const {
                target: { value },
              } = e;
              setSelectedJudges(
                // On autofill we get a stringified value.
                typeof value === 'string' ? value.split(',') : value,
              );
            }}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((judgeId) => {
                  const judge = judges.find(j => j.id === judgeId);
                  return (
                    <Chip
                      key={judgeId}
                      label={judge?.name || judgeId}
                      size="small"
                    />
                  );
                })}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 224,
                  width: 250,
                },
              },
            }}
          >
            {judges.map((judge) => (
              <MenuItem key={judge.id} value={judge.id}>
                <Checkbox checked={selectedJudges.indexOf(judge.id) > -1} />
                <ListItemText
                  primary={judge.name}
                  secondary={`${judge.email} • ${judge.category || 'No category'}`}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setSelectedJudges(judges.map(j => j.id))}
          >
            Select All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setSelectedJudges([])}
          >
            Clear All
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button onClick={() => setOpenAssignDialog(false)} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSaveJudgeAssignments}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : "Save Assignments"}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Criteria Manager Dialog */}
    {criteriaRound && (
      <RoundCriteriaManager
        round={criteriaRound}
        onClose={() => setCriteriaRound(null)}
      />
    )}

    {/* Results Panel Dialog */}
    {resultsRound && (
      <RoundResultsPanel
        round={resultsRound}
        onClose={() => setResultsRound(null)}
      />
    )}

    {/* Team Selection Panel Dialog */}
    {selectionRound && (
      <TeamSelectionPanel
        round={selectionRound}
        rounds={rounds}
        onClose={() => setSelectionRound(null)}
        onRefresh={() => onRoundsChange([...rounds])}
      />
    )}

    {/* Judge Progress Dashboard Dialog */}
    {progressRound && (
      <JudgeProgressDashboard
        round={progressRound}
        onClose={() => setProgressRound(null)}
      />
    )}
    </Box >
  );
}

export default RoundsTab;
