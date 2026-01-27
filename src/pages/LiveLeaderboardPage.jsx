import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LiveLeaderboard from '../components/LiveLeaderboard';
import {
  Box,
  Container,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  IconButton,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';

function LiveLeaderboardPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  async function loadEventData() {
    setLoading(true);

    try {
      // Load event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();

      setEvent(eventData);

      // Load rounds
      const { data: roundsData } = await supabase
        .from('rounds')
        .select('*')
        .eq('event_id', eventId)
        .order('round_number');

      setRounds(roundsData || []);

      // Auto-select first active round or first round
      if (roundsData && roundsData.length > 0) {
        const activeRound = roundsData.find(r => r.status === 'active') || roundsData[0];
        setSelectedRoundId(activeRound.id);
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}
      >
        <CircularProgress sx={{ color: '#7c3aed' }} />
      </Box>
    );
  }

  if (!event) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Event not found</Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => navigate(`/admin/event/${eventId}`)}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Breadcrumbs separator="›" sx={{ mb: 0.5 }}>
                  <Link
                    href="/admin/events"
                    underline="hover"
                    color="inherit"
                    sx={{ fontSize: '0.875rem' }}
                  >
                    Events
                  </Link>
                  <Link
                    href={`/admin/event/${eventId}`}
                    underline="hover"
                    color="inherit"
                    sx={{ fontSize: '0.875rem' }}
                  >
                    {event.name}
                  </Link>
                  <Typography color="text.primary" sx={{ fontSize: '0.875rem' }}>
                    Live Leaderboard
                  </Typography>
                </Breadcrumbs>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LeaderboardIcon sx={{ color: '#7c3aed' }} />
                  <Typography variant="h5" fontWeight={700} color="text.primary">
                    Live Leaderboard
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Round Selector */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Round</InputLabel>
              <Select
                value={selectedRoundId}
                label="Select Round"
                onChange={(e) => setSelectedRoundId(e.target.value)}
              >
                {rounds.map(round => (
                  <MenuItem key={round.id} value={round.id}>
                    {round.name}
                    {round.status === 'active' && ' (Active)'}
                    {round.is_computed && ' ✓'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Container>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {rounds.length === 0 ? (
          <Alert severity="info">
            No rounds created yet. Create a round to start tracking live scores.
          </Alert>
        ) : !selectedRoundId ? (
          <Alert severity="info">
            Select a round to view the live leaderboard.
          </Alert>
        ) : (
          <LiveLeaderboard roundId={selectedRoundId} eventId={eventId} />
        )}
      </Container>
    </Box>
  );
}

export default LiveLeaderboardPage;
