import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Container,
  Paper,
  IconButton
} from "@mui/material";
import {
  Event as EventIcon,
  People as PeopleIcon,
  Gavel as GavelIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon
} from "@mui/icons-material";
import { supabase } from "../supabaseClient";
import Navigation from "../components/Navigation";
// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    events: 0,
    judges: 0,
    teams: 0,
    activeRounds: 0
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // 1. Fetch Counts
      const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
      const { count: judgeCount } = await supabase.from('judges').select('*', { count: 'exact', head: true });
      const { count: teamCount } = await supabase.from('teams').select('*', { count: 'exact', head: true });

      // 2. Fetch Recent Events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      // 3. Fetch Evaluation Stats for Chart (Evaluations per Round for active event)
      // Getting the most recent active event used for chart
      const { data: activeEvent } = await supabase
        .from('events')
        .select('id, name')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let chartData = null;

      if (activeEvent) {
        const { data: rounds } = await supabase
          .from('rounds')
          .select('id, name, round_number')
          .eq('event_id', activeEvent.id)
          .order('round_number');

        if (rounds && rounds.length > 0) {
          const roundLabels = [];
          const evalCounts = [];

          for (const r of rounds) {
            const { count } = await supabase
              .from('round_evaluations')
              .select('*', { count: 'exact', head: true })
              .eq('round_id', r.id)
              .eq('is_draft', false); // Only count submitted

            roundLabels.push(r.name);
            evalCounts.push(count || 0);
          }

          chartData = {
            labels: roundLabels,
            datasets: [
              {
                label: 'Submitted Evaluations',
                data: evalCounts,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
              }
            ]
          };
        }
      }

      setStats({
        events: eventCount || 0,
        judges: judgeCount || 0,
        teams: teamCount || 0,
        activeRounds: 0 // Placeholder
      });
      setRecentEvents(events || []);
      setChartData(chartData);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  const StatCard = ({ title, value, icon, color, path }) => (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        p: 2,
        cursor: path ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': path ? { transform: 'translateY(-4px)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' } : {}
      }}
      onClick={() => path && navigate(path)}
    >
      <Box
        sx={{
          p: 2,
          borderRadius: '50%',
          backgroundColor: `${color}20`,
          color: color,
          mr: 3
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight="700" color="text.primary">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight="500">
          {title}
        </Typography>
      </Box>
    </Card>
  );

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Navigation />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" gutterBottom sx={{ color: '#1e293b' }}>
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Overview of your scoring platform
            </Typography>
          </Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            variant="outlined"
            sx={{ borderRadius: '8px' }}
          >
            Refresh
          </Button>
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Events"
              value={stats.events}
              icon={<EventIcon fontSize="large" />}
              color="#3b82f6"
              path="/admin/events"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Registered Judges"
              value={stats.judges}
              icon={<GavelIcon fontSize="large" />}
              color="#ef4444"
              path="/admin/users"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Participating Teams"
              value={stats.teams}
              icon={<PeopleIcon fontSize="large" />}
              color="#10b981"
            // No direct team page yet, maybe add later
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/events')}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 'bold',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                }}
              >
                Create New Event
              </Button>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          {/* Main Chart Section */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: '16px', height: '100%' }}>
              <Typography variant="h6" fontWeight="700" gutterBottom>
                Evaluation Activity (Active Event)
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <CircularProgress />
                </Box>
              ) : chartData ? (
                <Box sx={{ height: 300 }}>
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                      }
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <Typography>No active event data to display</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Recent Events / Quick Links */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: '16px', height: '100%' }}>
              <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 3 }}>
                Recent Events
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentEvents.map(event => (
                  <Card
                    key={event.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#3b82f6', backgroundColor: '#f8fafc' }
                    }}
                    onClick={() => navigate(`/admin/event/${event.id}`)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600">{event.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(event.created_at).toLocaleDateString()} • {event.status}
                        </Typography>
                      </Box>
                      <ArrowForwardIcon fontSize="small" color="action" />
                    </Box>
                  </Card>
                ))}

                {recentEvents.length === 0 && !loading && (
                  <Typography color="text.secondary" align="center">No events found.</Typography>
                )}

                <Button
                  fullWidth
                  variant="text"
                  sx={{ mt: 1 }}
                  onClick={() => navigate('/admin/events')}
                >
                  View All Events
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

      </Container>
    </Box>
  );
}

export default AdminDashboard;
