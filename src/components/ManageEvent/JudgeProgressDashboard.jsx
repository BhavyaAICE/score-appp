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
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Email as EmailIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { roundService } from "../../services/roundService";
import { supabase } from "../../supabaseClient";

function JudgeProgressDashboard({ round, onClose }) {
  const [judgeProgress, setJudgeProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadProgress();
  }, [round.id]);

  const loadProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all judges assigned to this round
      const judgeAssignments = await roundService.getRoundJudgeAssignments(round.id);
      
      // Get progress for each judge
      const progressData = await Promise.all(
        judgeAssignments.map(async (assignment) => {
          const progress = await roundService.getJudgeRoundProgress(round.id, assignment.judge_id);
          return {
            ...assignment,
            progress,
          };
        })
      );

      setJudgeProgress(progressData);
    } catch (err) {
      console.error("Error loading judge progress:", err);
      setError("Failed to load judge progress");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (judge) => {
    setSending(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-email', {
        body: {
          to: judge.email,
          templateId: 'scoring_reminder',
          eventName: round.name,
          judgeName: judge.name,
          completedCount: judge.progress?.submitted || 0,
          totalCount: judge.progress?.total || 0,
        }
      });

      if (fnError) throw fnError;

      setSuccess(`Reminder sent to ${judge.name}`);
    } catch (err) {
      console.error("Error sending reminder:", err);
      setError(`Failed to send reminder: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleSendAllReminders = async () => {
    const incompleteJudges = judgeProgress.filter(jp => !jp.progress?.isComplete);
    
    if (incompleteJudges.length === 0) {
      setError("All judges have completed their evaluations");
      return;
    }

    setSending(true);
    setError(null);

    try {
      for (const jp of incompleteJudges) {
        await handleSendReminder(jp.judge);
      }
      setSuccess(`Reminders sent to ${incompleteJudges.length} judges`);
    } catch (err) {
      setError("Failed to send some reminders");
    } finally {
      setSending(false);
    }
  };

  const getProgressColor = (progress) => {
    if (!progress) return "#9ca3af";
    if (progress.progress >= 100) return "#22c55e";
    if (progress.progress >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const completedJudges = judgeProgress.filter(jp => jp.progress?.isComplete).length;
  const totalJudges = judgeProgress.length;
  const overallProgress = totalJudges > 0 ? (completedJudges / totalJudges) * 100 : 0;

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ color: "#3b82f6" }} />
            Judge Progress - {round.name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Monitor and manage judge evaluations
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadProgress}
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

        {/* Overall Progress */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8fafc' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Overall Progress
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                icon={<CheckCircleIcon />}
                label={`${completedJudges}/${totalJudges} judges complete`}
                color={completedJudges === totalJudges ? "success" : "default"}
              />
            </Box>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={overallProgress}
            sx={{ 
              height: 12, 
              borderRadius: 6,
              bgcolor: '#e2e8f0',
              '& .MuiLinearProgress-bar': {
                bgcolor: overallProgress >= 100 ? '#22c55e' : '#3b82f6',
                borderRadius: 6
              }
            }}
          />
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {overallProgress.toFixed(0)}% of judges have completed all evaluations
          </Typography>
        </Paper>

        {/* Send All Reminders */}
        {judgeProgress.some(jp => !jp.progress?.isComplete) && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={sending ? <CircularProgress size={18} /> : <EmailIcon />}
              onClick={handleSendAllReminders}
              disabled={sending}
            >
              Send Reminder to All Incomplete Judges
            </Button>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : judgeProgress.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc' }}>
            <PersonIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
            <Typography color="textSecondary">
              No judges assigned to this round yet.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Judge</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 200 }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {judgeProgress.map((jp) => (
                  <TableRow key={jp.judge_id}>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {jp.judge?.name || 'Unknown'}
                    </TableCell>
                    <TableCell sx={{ color: '#6b7280' }}>
                      {jp.judge?.email || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={jp.judge?.category || 'N/A'} 
                        size="small" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={jp.progress?.progress || 0}
                          sx={{ 
                            flex: 1, 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: '#e2e8f0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getProgressColor(jp.progress),
                              borderRadius: 4
                            }
                          }}
                        />
                        <Typography variant="body2" sx={{ minWidth: 60 }}>
                          {jp.progress?.submitted || 0}/{jp.progress?.total || 0}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {jp.progress?.isComplete ? (
                        <Chip 
                          icon={<CheckCircleIcon />}
                          label="Complete"
                          size="small"
                          color="success"
                        />
                      ) : jp.progress?.submitted > 0 ? (
                        <Chip 
                          icon={<ScheduleIcon />}
                          label="In Progress"
                          size="small"
                          color="warning"
                        />
                      ) : (
                        <Chip 
                          icon={<WarningIcon />}
                          label="Not Started"
                          size="small"
                          color="error"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={jp.progress?.isComplete ? "Already complete" : "Send reminder"}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleSendReminder(jp.judge)}
                            disabled={sending || jp.progress?.isComplete}
                            sx={{ color: jp.progress?.isComplete ? '#9ca3af' : '#3b82f6' }}
                          >
                            <EmailIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Summary Stats */}
        {judgeProgress.length > 0 && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center', bgcolor: '#f0fdf4' }}>
              <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>
                {completedJudges}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Completed
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center', bgcolor: '#fef3c7' }}>
              <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 700 }}>
                {judgeProgress.filter(jp => jp.progress?.submitted > 0 && !jp.progress?.isComplete).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                In Progress
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center', bgcolor: '#fef2f2' }}>
              <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 700 }}>
                {judgeProgress.filter(jp => !jp.progress?.submitted).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Not Started
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default JudgeProgressDashboard;
