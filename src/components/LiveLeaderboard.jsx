import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Avatar,
  Badge,
  Tooltip,
  IconButton,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import RefreshIcon from '@mui/icons-material/Refresh';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// Rank colors for top 3
const getRankStyle = (rank) => {
  switch (rank) {
    case 1:
      return { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', color: '#000', icon: '🥇' };
    case 2:
      return { bg: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)', color: '#000', icon: '🥈' };
    case 3:
      return { bg: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', color: '#fff', icon: '🥉' };
    default:
      return { bg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', color: '#334155', icon: null };
  }
};

// Calculate live scores from evaluations
const calculateLiveScores = (evaluations, teams, criteria) => {
  const teamScores = {};

  // Initialize all teams
  teams.forEach(team => {
    teamScores[team.id] = {
      team_id: team.id,
      team_name: team.name,
      category: team.category_id,
      total_raw: 0,
      evaluation_count: 0,
      avg_score: 0,
      max_possible: 0,
      percentage: 0,
      last_updated: null
    };
  });

  // Aggregate scores from evaluations
  evaluations.forEach(evaluation => {
    if (!evaluation.is_draft && evaluation.scores) {
      const teamId = evaluation.team_id;
      if (!teamScores[teamId]) return;

      let evalTotal = 0;
      let maxPossible = 0;

      // Sum up scores from this evaluation
      Object.entries(evaluation.scores).forEach(([criterionId, score]) => {
        evalTotal += parseFloat(score) || 0;
        const criterion = criteria.find(c => c.id === criterionId);
        if (criterion) {
          maxPossible += criterion.max_marks;
        }
      });

      teamScores[teamId].total_raw += evalTotal;
      teamScores[teamId].max_possible += maxPossible;
      teamScores[teamId].evaluation_count += 1;

      // Track latest update
      const evalTime = new Date(evaluation.submitted_at);
      if (!teamScores[teamId].last_updated || evalTime > teamScores[teamId].last_updated) {
        teamScores[teamId].last_updated = evalTime;
      }
    }
  });

  // Calculate averages and percentages
  Object.values(teamScores).forEach(team => {
    if (team.evaluation_count > 0) {
      team.avg_score = team.total_raw / team.evaluation_count;
      team.percentage = team.max_possible > 0 ? (team.total_raw / team.max_possible) * 100 : 0;
    }
  });

  // Sort and assign ranks
  const sorted = Object.values(teamScores)
    .filter(t => t.evaluation_count > 0)
    .sort((a, b) => b.avg_score - a.avg_score);

  sorted.forEach((team, index) => {
    team.rank = index + 1;
  });

  // Add unranked teams at the end
  const unranked = Object.values(teamScores).filter(t => t.evaluation_count === 0);
  unranked.forEach(team => {
    team.rank = null;
  });

  return [...sorted, ...unranked];
};

function LiveLeaderboard({ roundId, eventId }) {
  const [teams, setTeams] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [previousRanks, setPreviousRanks] = useState({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [round, setRound] = useState(null);

  // Load initial data
  useEffect(() => {
    if (roundId) {
      loadInitialData();
    }
  }, [roundId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!roundId) return;

    const channel = supabase
      .channel(`leaderboard-${roundId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_evaluations',
          filter: `round_id=eq.${roundId}`
        },
        (payload) => {
          console.log('Evaluation change:', payload);
          handleEvaluationChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId]);

  // Recalculate leaderboard when data changes
  useEffect(() => {
    if (teams.length > 0 && criteria.length > 0) {
      // Store previous ranks for animation
      const prevRanks = {};
      leaderboard.forEach(team => {
        prevRanks[team.team_id] = team.rank;
      });
      setPreviousRanks(prevRanks);

      // Calculate new leaderboard
      const newLeaderboard = calculateLiveScores(evaluations, teams, criteria);
      setLeaderboard(newLeaderboard);
      setLastUpdate(new Date());
    }
  }, [evaluations, teams, criteria]);

  async function loadInitialData() {
    setLoading(true);

    try {
      // Load round info
      const { data: roundData } = await supabase
        .from('rounds')
        .select('*, events(name)')
        .eq('id', roundId)
        .maybeSingle();

      setRound(roundData);

      // Load teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('event_id', eventId);

      setTeams(teamsData || []);

      // Load criteria
      const { data: criteriaData } = await supabase
        .from('round_criteria')
        .select('*')
        .eq('round_id', roundId)
        .order('display_order');

      setCriteria(criteriaData || []);

      // Load evaluations
      const { data: evalsData } = await supabase
        .from('round_evaluations')
        .select('*')
        .eq('round_id', roundId);

      setEvaluations(evalsData || []);
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    }

    setLoading(false);
  }

  function handleEvaluationChange(payload) {
    if (payload.eventType === 'INSERT') {
      setEvaluations(prev => [...prev, payload.new]);
    } else if (payload.eventType === 'UPDATE') {
      setEvaluations(prev => prev.map(e =>
        e.id === payload.new.id ? payload.new : e
      ));
    } else if (payload.eventType === 'DELETE') {
      setEvaluations(prev => prev.filter(e => e.id !== payload.old.id));
    }
    setLastUpdate(new Date());
  }

  function getRankChange(teamId, currentRank) {
    const previousRank = previousRanks[teamId];
    if (!previousRank || !currentRank) return 'none';
    if (previousRank > currentRank) return 'up';
    if (previousRank < currentRank) return 'down';
    return 'none';
  }

  // Stats
  const stats = useMemo(() => {
    const evaluated = leaderboard.filter(t => t.evaluation_count > 0).length;
    const totalEvals = evaluations.filter(e => !e.is_draft).length;
    const draftEvals = evaluations.filter(e => e.is_draft).length;

    return { evaluated, totalEvals, draftEvals, totalTeams: teams.length };
  }, [leaderboard, evaluations, teams]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          p: 3,
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EmojiEventsIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Live Leaderboard
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {round?.name} • {round?.events?.name}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={connected ? 'Live updates active' : 'Connecting...'}>
              <Chip
                icon={<FiberManualRecordIcon sx={{ fontSize: 12, color: connected ? '#4ade80' : '#fbbf24' }} />}
                label={connected ? 'LIVE' : 'Connecting'}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600
                }}
              />
            </Tooltip>
            <IconButton onClick={loadInitialData} sx={{ color: 'white' }}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Stats Row */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Teams Evaluated</Typography>
            <Typography variant="h6" fontWeight={700}>
              {stats.evaluated} / {stats.totalTeams}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Submissions</Typography>
            <Typography variant="h6" fontWeight={700}>
              {stats.totalEvals}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>Drafts</Typography>
            <Typography variant="h6" fontWeight={700}>
              {stats.draftEvals}
            </Typography>
          </Box>
          {lastUpdate && (
            <Box sx={{ ml: 'auto' }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Last Update</Typography>
              <Typography variant="body2" fontWeight={500}>
                {lastUpdate.toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Leaderboard Content */}
      <Box sx={{ p: 2 }}>
        {leaderboard.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            No evaluations submitted yet. Rankings will appear here as judges submit scores.
          </Alert>
        ) : (
          <AnimatePresence>
            {leaderboard.map((team, index) => {
              const rankStyle = getRankStyle(team.rank);
              const rankChange = getRankChange(team.team_id, team.rank);

              return (
                <motion.div
                  key={team.team_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  <Paper
                    elevation={team.rank && team.rank <= 3 ? 2 : 0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      mb: 1.5,
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: team.rank && team.rank <= 3 ? 'transparent' : 'divider',
                      background: team.rank && team.rank <= 3 ? rankStyle.bg : '#fff',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    {/* Rank */}
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        background: team.rank && team.rank <= 3
                          ? 'rgba(255,255,255,0.3)'
                          : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        fontWeight: 700,
                        fontSize: team.rank && team.rank <= 3 ? '1.5rem' : '1.1rem',
                        color: rankStyle.color
                      }}
                    >
                      {rankStyle.icon || team.rank || '-'}
                    </Box>

                    {/* Team Info */}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          sx={{ color: team.rank && team.rank <= 3 ? rankStyle.color : 'text.primary' }}
                        >
                          {team.team_name}
                        </Typography>

                        {/* Rank Change Indicator */}
                        {rankChange === 'up' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500 }}
                          >
                            <TrendingUpIcon sx={{ color: '#22c55e', fontSize: 20 }} />
                          </motion.div>
                        )}
                        {rankChange === 'down' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500 }}
                          >
                            <TrendingDownIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                          </motion.div>
                        )}
                      </Box>

                      {/* Progress Bar */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={team.percentage}
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: team.rank && team.rank <= 3
                              ? 'rgba(255,255,255,0.3)'
                              : 'rgba(0,0,0,0.08)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              background: team.rank && team.rank <= 3
                                ? 'rgba(255,255,255,0.9)'
                                : 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)'
                            }
                          }}
                        />
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ 
                            minWidth: 45,
                            color: team.rank && team.rank <= 3 ? rankStyle.color : 'text.secondary'
                          }}
                        >
                          {team.percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>

                    {/* Score Info */}
                    <Box sx={{ textAlign: 'right', ml: 2 }}>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ color: team.rank && team.rank <= 3 ? rankStyle.color : 'text.primary' }}
                      >
                        {team.avg_score.toFixed(1)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: team.rank && team.rank <= 3 ? rankStyle.color : 'text.secondary', opacity: 0.8 }}
                      >
                        avg · {team.evaluation_count} evals
                      </Typography>
                    </Box>
                  </Paper>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </Box>
    </Paper>
  );
}

export default LiveLeaderboard;
