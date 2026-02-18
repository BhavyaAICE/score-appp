import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Navigation from '../components/Navigation';
import { invitationService, RolePermissions } from '../services/invitationService';

export default function SharedEventsPage() {
  const navigate = useNavigate();
  const [sharedEvents, setSharedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSharedEvents();
  }, []);

  const loadSharedEvents = async () => {
    try {
      const data = await invitationService.getSharedEvents();
      setSharedEvents(data);
    } catch (err) {
      setError('Failed to load shared events');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)' }}>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress sx={{ color: '#7c3aed' }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)' }}>
      <Navigation />

      <Box sx={{ maxWidth: '1400px', mx: 'auto', px: 4, py: 8 }}>
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1.5,
              fontSize: '2.5rem'
            }}
          >
            Shared With Me
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: '#64748b', fontSize: '1.1rem' }}
          >
            Events that have been shared with you by other organizations
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {sharedEvents.length === 0 ? (
          <Card
            sx={{
              p: 8,
              textAlign: 'center',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
            }}
          >
            <EventIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} color="#1e293b" mb={1}>
              No Shared Events Yet
            </Typography>
            <Typography color="#64748b">
              When someone shares an event with you, it will appear here.
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {sharedEvents.map((event) => {
              const roleInfo = RolePermissions[event.role];
              
              return (
                <Card
                  key={event.event_id}
                  sx={{
                    width: '360px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 12px 35px rgba(124, 58, 237, 0.2)',
                      transform: 'translateY(-4px)'
                    }
                  }}
                  onClick={() => navigate(`/admin/event/${event.event_id}`)}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Event Name */}
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      color="#1e293b"
                      mb={2}
                    >
                      {event.event_name}
                    </Typography>

                    {/* Organization */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <PersonIcon sx={{ color: 'white', fontSize: 18 }} />
                      </Box>
                      <Box>
                        <Typography fontSize="0.85rem" color="#64748b">
                          Shared by
                        </Typography>
                        <Typography fontWeight={600} color="#1e293b" fontSize="0.9rem">
                          {event.shared_by_name || event.shared_by_email}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Organization Name */}
                    <Typography color="#64748b" fontSize="0.9rem" mb={2}>
                      From: {event.organization_name}
                    </Typography>

                    {/* Role & Date */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        label={roleInfo?.displayName || event.role}
                        size="small"
                        sx={{
                          backgroundColor: roleInfo?.color + '20',
                          color: roleInfo?.color,
                          fontWeight: 600
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#9ca3af' }}>
                        <AccessTimeIcon sx={{ fontSize: 16 }} />
                        <Typography fontSize="0.8rem">
                          {formatDate(event.granted_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
