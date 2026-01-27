import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import { 
  AssignmentInd, 
  CheckCircle, 
  HourglassEmpty,
  Lock as LockIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { eventService } from '../services/eventService';
import { roundService } from '../services/roundService';

function JudgeDashboard() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [judge, setJudge] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [assignedTeams, setAssignedTeams] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submittedTeams, setSubmittedTeams] = useState(new Set());
  const [absentTeams, setAbsentTeams] = useState(new Set());
  const [roundProgress, setRoundProgress] = useState({});

  useEffect(() => {
    if (!token) {
      setError('No access token provided. Please use the link from your invitation email.');
      setLoading(false);
      return;
    }

    loadJudgeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadJudgeData = async () => {
    try {
      // Find judge by token
      const foundJudge = await eventService.getJudgeByToken(token);

      if (!foundJudge) {
        setError(`Invalid access token. Please check your invitation link.`);
        setLoading(false);
        return;
      }

      setJudge(foundJudge);

      // Get all rounds this judge is assigned to with progress
      const judgeRounds = await roundService.getJudgeRoundsWithProgress(foundJudge.id);
      setRounds(judgeRounds);

      // Calculate progress for each round
      const progressMap = {};
      for (const round of judgeRounds) {
        progressMap[round.id] = round.progress;
      }
      setRoundProgress(progressMap);

      // Find the active round (first incomplete round in sequence)
      const activeRound = await roundService.getActiveRoundForJudge(foundJudge.id);
      
      if (activeRound) {
        setCurrentRound(activeRound);
        await loadRoundData(activeRound.id, foundJudge.id);
      } else if (judgeRounds.length > 0) {
        // Default to first round if no active round
        setCurrentRound(judgeRounds[0]);
        await loadRoundData(judgeRounds[0].id, foundJudge.id);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading judge data:', error);
      setError(`Failed to load judge data: ${error.message}`);
      setLoading(false);
    }
  };

  const loadRoundData = async (roundId, judgeId) => {
    try {
      // Get teams assigned to this judge for this round
      const teams = await roundService.getTeamsAssignedToJudgeForRound(roundId, judgeId);
      setAssignedTeams(teams);

      // Track absent teams
      const absent = new Set(teams.filter(team => team.is_absent).map(team => team.id));
      setAbsentTeams(absent);

      // Get criteria for this round
      const roundCriteria = await roundService.getRoundCriteria(roundId);
      setCriteria(roundCriteria);

      // Get existing evaluations for this round
      const evaluations = await roundService.getJudgeEvaluationsForRound(roundId, judgeId);

      const scoresMap = {};
      const submitted = new Set();

      evaluations.forEach(evaluation => {
        scoresMap[evaluation.team_id] = evaluation.scores || {};
        if (!evaluation.is_draft) {
          submitted.add(evaluation.team_id);
        }
      });

      setScores(scoresMap);
      setSubmittedTeams(submitted);
    } catch (error) {
      console.error('Error loading round data:', error);
      setError(`Failed to load round data: ${error.message}`);
    }
  };

  const handleRoundSelect = async (round) => {
    // Check if previous rounds are complete (sequential flow)
    const roundIndex = rounds.findIndex(r => r.id === round.id);
    for (let i = 0; i < roundIndex; i++) {
      const prevRound = rounds[i];
      if (!roundProgress[prevRound.id]?.isComplete) {
        alert(`Please complete ${prevRound.name} before accessing ${round.name}`);
        return;
      }
    }

    // Check if round is active
    if (round.status === 'draft') {
      alert('This round has not started yet. Please wait for the admin to activate it.');
      return;
    }

    if (round.status === 'closed' || round.status === 'completed') {
      // Allow viewing but not editing
    }

    setCurrentRound(round);
    setLoading(true);
    await loadRoundData(round.id, judge.id);
    setLoading(false);
  };

  const handleScoreChange = (teamId, criterionId, value, maxScore) => {
    const numValue = parseFloat(value);
    if (value !== '' && (isNaN(numValue) || numValue < 0 || numValue > maxScore)) return;

    setScores(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [criterionId]: value === '' ? '' : numValue
      }
    }));
  };

  const handleSubmitScores = async (teamId) => {
    const teamScores = scores[teamId] || {};
    const allFilled = criteria.every(c => 
      teamScores[c.id] !== undefined && teamScores[c.id] !== ''
    );

    if (!allFilled) {
      alert('Please fill in all criteria scores before submitting.');
      return;
    }

    try {
      await roundService.submitRoundEvaluation(
        currentRound.id,
        judge.id,
        teamId,
        teamScores
      );

      const newSubmitted = new Set(submittedTeams);
      newSubmitted.add(teamId);
      setSubmittedTeams(newSubmitted);

      // Update round progress
      const progress = await roundService.getJudgeRoundProgress(currentRound.id, judge.id);
      setRoundProgress(prev => ({
        ...prev,
        [currentRound.id]: progress
      }));

      alert('Scores submitted successfully!');
    } catch (error) {
      console.error('Error submitting scores:', error);
      alert('Failed to submit scores. Please try again.');
    }
  };

  const handleSaveDraft = async (teamId) => {
    const teamScores = scores[teamId] || {};

    try {
      await roundService.saveDraftEvaluation(
        currentRound.id,
        judge.id,
        teamId,
        teamScores
      );
      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    }
  };

  const handleMarkAbsent = async (teamId) => {
    try {
      const isCurrentlyAbsent = absentTeams.has(teamId);
      await eventService.markTeamAbsent(teamId, !isCurrentlyAbsent);

      const newAbsentTeams = new Set(absentTeams);
      if (isCurrentlyAbsent) {
        newAbsentTeams.delete(teamId);
      } else {
        newAbsentTeams.add(teamId);
        const newSubmittedTeams = new Set(submittedTeams);
        newSubmittedTeams.delete(teamId);
        setSubmittedTeams(newSubmittedTeams);
      }
      setAbsentTeams(newAbsentTeams);

      alert(isCurrentlyAbsent ? 'Team marked as present.' : 'Team marked as absent.');
    } catch (error) {
      console.error('Error marking team absent:', error);
      alert('Failed to update team status. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f5f7fa', p: 4 }}>
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        </Box>
      </Box>
    );
  }

  const teamsToScore = assignedTeams.filter(team => !absentTeams.has(team.id));
  const progressPercent = teamsToScore.length > 0 
    ? (submittedTeams.size / teamsToScore.length) * 100 
    : 0;

  const isRoundEditable = currentRound?.status === 'active';

  return (
    <Box sx={{ minHeight: '100vh', background: '#f5f7fa', p: 4 }}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
        {/* Header */}
        <Card sx={{ p: 4, mb: 4, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssignmentInd sx={{ fontSize: 40, color: '#2563eb', mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Judge Dashboard
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                Welcome, {judge?.name}
              </Typography>
            </Box>
          </Box>

          {/* Round Progress Stepper */}
          {rounds.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#64748b' }}>
                ROUND PROGRESS (Sequential)
              </Typography>
              <Stepper activeStep={rounds.findIndex(r => r.id === currentRound?.id)} alternativeLabel>
                {rounds.map((round, index) => {
                  const progress = roundProgress[round.id];
                  const isComplete = progress?.isComplete;
                  const isPreviousComplete = index === 0 || roundProgress[rounds[index - 1]?.id]?.isComplete;
                  const isAccessible = isPreviousComplete && round.status !== 'draft';
                  
                  return (
                    <Step 
                      key={round.id} 
                      completed={isComplete}
                      sx={{ cursor: isAccessible ? 'pointer' : 'not-allowed' }}
                      onClick={() => isAccessible && handleRoundSelect(round)}
                    >
                      <StepLabel
                        error={!isPreviousComplete && !isComplete}
                        icon={
                          round.status === 'draft' ? <LockIcon /> :
                          isComplete ? <CheckCircle sx={{ color: '#10b981' }} /> :
                          round.id === currentRound?.id ? <PlayArrowIcon sx={{ color: '#3b82f6' }} /> :
                          undefined
                        }
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {round.name}
                          </Typography>
                          {progress && (
                            <Typography variant="caption" color="textSecondary">
                              {progress.submitted}/{progress.total} teams
                            </Typography>
                          )}
                        </Box>
                      </StepLabel>
                    </Step>
                  );
                })}
              </Stepper>
            </Box>
          )}

          {/* Current Round Stats */}
          {currentRound && (
            <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
              <Chip
                label={currentRound.name}
                color="primary"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={currentRound.status === 'active' ? 'Open for Judging' : 
                       currentRound.status === 'draft' ? 'Not Started' : 'Closed'}
                color={currentRound.status === 'active' ? 'success' : 
                       currentRound.status === 'draft' ? 'default' : 'warning'}
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`${assignedTeams.length} Teams Assigned`}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`${submittedTeams.size}/${teamsToScore.length} Scored`}
                color={submittedTeams.size === teamsToScore.length ? 'success' : 'warning'}
                sx={{ fontWeight: 600 }}
              />
              {absentTeams.size > 0 && (
                <Chip
                  label={`${absentTeams.size} Absent`}
                  color="error"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>
          )}

          {/* Progress Bar */}
          {teamsToScore.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Round Progress
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {Math.round(progressPercent)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progressPercent} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: progressPercent === 100 
                      ? 'linear-gradient(90deg, #10b981, #059669)' 
                      : 'linear-gradient(90deg, #3b82f6, #2563eb)'
                  }
                }}
              />
            </Box>
          )}
        </Card>

        {/* No Round Warning */}
        {!currentRound && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No rounds have been assigned to you yet. Please wait for the event administrator to set up rounds and assign you.
          </Alert>
        )}

        {/* Round Not Active Warning */}
        {currentRound && !isRoundEditable && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {currentRound.status === 'draft' 
              ? 'This round has not started yet. Please wait for the admin to activate it.'
              : 'This round is closed. You can view your scores but cannot make changes.'}
          </Alert>
        )}

        {/* Teams List */}
        {assignedTeams.length === 0 ? (
          <Alert severity="info">No teams have been assigned to you for this round.</Alert>
        ) : (
          <Box>
            {assignedTeams.map((team) => {
              const teamScores = scores[team.id] || {};
              const isSubmitted = submittedTeams.has(team.id);
              const isAbsent = absentTeams.has(team.id);

              return (
                <Card
                  key={team.id}
                  sx={{
                    mb: 3,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    opacity: isAbsent ? 0.6 : 1,
                    border: isAbsent ? '2px solid #ef4444' : 'none'
                  }}
                >
                  <Box sx={{
                    p: 3,
                    background: isAbsent ? '#fee2e2' : (isSubmitted ? '#ecfdf5' : '#f8fafc'),
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {team.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {team.project_title || 'No project title'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {isAbsent ? (
                          <Chip label="Absent" color="error" sx={{ fontWeight: 600 }} />
                        ) : isSubmitted ? (
                          <Chip icon={<CheckCircle />} label="Submitted" color="success" sx={{ fontWeight: 600 }} />
                        ) : (
                          <Chip icon={<HourglassEmpty />} label="Pending" color="warning" sx={{ fontWeight: 600 }} />
                        )}
                      </Box>
                    </Box>

                    {isRoundEditable && (
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          variant={isAbsent ? "contained" : "outlined"}
                          size="small"
                          onClick={() => handleMarkAbsent(team.id)}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            ...(isAbsent ? {
                              background: '#10b981',
                              '&:hover': { background: '#059669' }
                            } : {
                              borderColor: '#ef4444',
                              color: '#ef4444',
                              '&:hover': { borderColor: '#dc2626', background: '#fef2f2' }
                            })
                          }}
                        >
                          {isAbsent ? 'Mark Present' : 'Mark Absent'}
                        </Button>
                      </Box>
                    )}
                  </Box>

                  {!isAbsent && (
                    <>
                      <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                              <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Criterion</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Max Score</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Your Score</TableCell>
                              <TableCell sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Weight</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {criteria.map((criterion) => (
                              <TableRow
                                key={criterion.id}
                                sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}
                              >
                                <TableCell>
                                  <Typography sx={{ fontWeight: 600, color: '#334155' }}>
                                    {criterion.name}
                                  </Typography>
                                  {criterion.description && (
                                    <Typography variant="caption" color="textSecondary">
                                      {criterion.description}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={{ color: '#64748b', fontWeight: 500 }}>
                                  {criterion.max_marks}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={teamScores[criterion.id] ?? ''}
                                    onChange={(e) => handleScoreChange(
                                      team.id, 
                                      criterion.id, 
                                      e.target.value, 
                                      criterion.max_marks
                                    )}
                                    disabled={isSubmitted || !isRoundEditable}
                                    inputProps={{ 
                                      min: 0, 
                                      max: criterion.max_marks, 
                                      step: 0.5 
                                    }}
                                    sx={{ width: '140px' }}
                                    placeholder={`0-${criterion.max_marks}`}
                                  />
                                </TableCell>
                                <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>
                                  {criterion.weight}x
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', gap: 2, background: '#fafafa' }}>
                        {isRoundEditable && !isSubmitted && (
                          <>
                            <Button
                              variant="outlined"
                              onClick={() => handleSaveDraft(team.id)}
                              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                            >
                              Save Draft
                            </Button>
                            <Button
                              variant="contained"
                              onClick={() => handleSubmitScores(team.id)}
                              sx={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '8px',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                }
                              }}
                            >
                              Submit Scores
                            </Button>
                          </>
                        )}
                        {isSubmitted && (
                          <Typography color="success.main" sx={{ fontWeight: 600 }}>
                            ✓ Evaluation submitted
                          </Typography>
                        )}
                      </Box>
                    </>
                  )}
                </Card>
              );
            })}
          </Box>
        )}

        {/* All Complete Message */}
        {submittedTeams.size === teamsToScore.length && teamsToScore.length > 0 && (
          <Card sx={{ 
            p: 4, 
            textAlign: 'center', 
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            borderRadius: '16px'
          }}>
            <CheckCircle sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#065f46', mb: 1 }}>
              Round Complete! 🎉
            </Typography>
            <Typography color="textSecondary">
              {rounds.findIndex(r => r.id === currentRound?.id) < rounds.length - 1 
                ? 'You can now proceed to the next round.'
                : 'You have completed all your evaluations. Thank you!'}
            </Typography>
          </Card>
        )}
      </Box>
    </Box>
  );
}

export default JudgeDashboard;
