import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PersonIcon from '@mui/icons-material/Person';
import EventIcon from '@mui/icons-material/Event';
import { invitationService, RolePermissions } from '../services/invitationService';
import { useApp } from '../context/AppContext';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useApp();
  
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      loadInvitation();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      const data = await invitationService.getInvitationByToken(token);
      
      if (!data) {
        setError('Invitation not found');
      } else if (data.status !== 'pending') {
        setError(`This invitation has already been ${data.status}`);
      } else if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
      } else {
        setInvitation(data);
      }
    } catch (err) {
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/accept-invitation?token=${token}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const result = await invitationService.acceptInvitation(token);
      
      if (result.success) {
        setSuccess(true);
        await refreshProfile();
        setTimeout(() => {
          navigate('/admin/events');
        }, 2000);
      } else {
        setError(result.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const roleInfo = invitation ? RolePermissions[invitation.role] : null;

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)'
        }}
      >
        <CircularProgress sx={{ color: '#7c3aed' }} />
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)'
        }}
      >
        <Card
          sx={{
            maxWidth: 500,
            width: '90%',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
            textAlign: 'center',
            p: 4
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 80, color: '#10b981', mb: 2 }} />
          <Typography variant="h4" fontWeight={700} color="#1e293b" mb={1}>
            Welcome Aboard!
          </Typography>
          <Typography color="#64748b" mb={3}>
            You've successfully joined {invitation?.organizations?.name}
          </Typography>
          <Typography color="#9ca3af" fontSize="0.9rem">
            Redirecting to your dashboard...
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
        p: 3
      }}
    >
      <Card
        sx={{
          maxWidth: 600,
          width: '100%',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            p: 4,
            textAlign: 'center'
          }}
        >
          <Typography variant="h4" fontWeight={700} color="white" mb={1}>
            You're Invited!
          </Typography>
          <Typography color="#e0d4fc">
            Join FairScore to collaborate on events
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error ? (
            <Alert
              severity="error"
              icon={<ErrorIcon />}
              sx={{ mb: 3 }}
            >
              {error}
            </Alert>
          ) : invitation && (
            <>
              {/* Inviter Info */}
              <Box sx={{ mb: 4 }}>
                <Typography color="#64748b" fontSize="0.85rem" mb={1}>
                  Invited by
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <PersonIcon sx={{ color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography fontWeight={600} color="#1e293b">
                      {invitation.user_profiles?.full_name || invitation.user_profiles?.email || 'Admin'}
                    </Typography>
                    <Typography color="#64748b" fontSize="0.9rem">
                      {invitation.organizations?.name}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Personal Message */}
              {invitation.message && (
                <Box
                  sx={{
                    background: '#f8fafc',
                    borderLeft: '4px solid #7c3aed',
                    p: 2,
                    borderRadius: '0 8px 8px 0',
                    mb: 4
                  }}
                >
                  <Typography color="#4b5563" fontStyle="italic">
                    "{invitation.message}"
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Role Info */}
              <Box sx={{ mb: 4 }}>
                <Typography color="#64748b" fontSize="0.85rem" mb={1}>
                  Your Role
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: roleInfo?.color
                    }}
                  />
                  <Typography fontWeight={700} color="#1e293b" fontSize="1.1rem">
                    {roleInfo?.displayName}
                  </Typography>
                </Box>
                <Typography color="#64748b" fontSize="0.9rem" mt={0.5}>
                  {roleInfo?.description}
                </Typography>
              </Box>

              {/* Events Access */}
              <Box sx={{ mb: 4 }}>
                <Typography color="#64748b" fontSize="0.85rem" mb={1}>
                  Event Access ({invitation.event_ids?.length || 0} events)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {invitation.event_ids?.map((eventId, index) => (
                    <Chip
                      key={eventId}
                      icon={<EventIcon />}
                      label={`Event ${index + 1}`}
                      sx={{
                        backgroundColor: '#f3e8ff',
                        color: '#7c3aed',
                        fontWeight: 600
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/')}
                  sx={{
                    textTransform: 'none',
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    color: '#64748b'
                  }}
                >
                  Decline
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAccept}
                  disabled={accepting}
                  startIcon={accepting ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    textTransform: 'none',
                    py: 1.5,
                    fontWeight: 700,
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
                    }
                  }}
                >
                  {accepting ? 'Accepting...' : user ? 'Accept Invitation' : 'Sign In to Accept'}
                </Button>
              </Box>

              {!user && (
                <Typography
                  color="#9ca3af"
                  fontSize="0.85rem"
                  textAlign="center"
                  mt={2}
                >
                  Don't have an account?{' '}
                  <Button
                    onClick={() => navigate(`/register?redirect=/accept-invitation?token=${token}`)}
                    sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                  >
                    Sign up
                  </Button>
                </Typography>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
