import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { invitationService, RolePermissions, InvitationRoles } from '../services/invitationService';
import { eventService } from '../services/eventService';
import { useApp } from '../context/AppContext';

export default function InviteUserModal({ open, onClose, onSuccess, organizationId }) {
  const { organization } = useApp();
  const resolvedOrganizationId = organizationId ?? organization?.id;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(InvitationRoles.VIEWER);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      loadEvents();
      resetForm();
    }
  }, [open]);

  const loadEvents = async () => {
    try {
      const eventsData = await eventService.getAllEvents();
      setEvents(eventsData);
    } catch (err) {
      console.error('Error loading events:', err);
    }
  };

  const resetForm = () => {
    setEmail('');
    setRole(InvitationRoles.VIEWER);
    setSelectedEvents([]);
    setMessage('');
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Please select at least one event');
      return;
    }
    if (!resolvedOrganizationId) {
      setError('Organization not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await invitationService.createInvitation({
        email,
        role,
        eventIds: selectedEvents,
        message,
        organizationId: resolvedOrganizationId
      });
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleInfo = RolePermissions[role] || RolePermissions.viewer;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 2.5
        }}
      >
        <PersonAddIcon />
        <Typography variant="h6" fontWeight={700}>
          Invite User
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {success ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} color="#1e293b">
              Invitation Sent!
            </Typography>
            <Typography color="#64748b" sx={{ mt: 1 }}>
              An email has been sent to {email}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Left side - Form */}
            <Box sx={{ flex: 1, p: 4 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                sx={{ mb: 3 }}
              />

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  label="Role"
                >
                  {Object.entries(RolePermissions).map(([key, info]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: info.color
                          }}
                        />
                        <Typography fontWeight={600}>{info.displayName}</Typography>
                        <Typography color="#9ca3af" sx={{ ml: 1, fontSize: '0.85rem' }}>
                          - {info.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Events</InputLabel>
                <Select
                  multiple
                  value={selectedEvents}
                  onChange={(e) => setSelectedEvents(e.target.value)}
                  input={<OutlinedInput label="Select Events" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((eventId) => {
                        const event = events.find(e => e.id === eventId);
                        return (
                          <Chip
                            key={eventId}
                            label={event?.name || eventId}
                            size="small"
                            sx={{ 
                              backgroundColor: '#f3e8ff',
                              color: '#7c3aed',
                              fontWeight: 600
                            }}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {events.map((event) => (
                    <MenuItem key={event.id} value={event.id}>
                      <Checkbox checked={selectedEvents.includes(event.id)} />
                      <ListItemText 
                        primary={event.name}
                        secondary={event.status}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Personal Message (Optional)"
                multiline
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message to the invitation..."
              />
            </Box>

            {/* Right side - Permission Preview */}
            <Paper
              elevation={0}
              sx={{
                width: { xs: '100%', md: '320px' },
                backgroundColor: '#f8fafc',
                borderLeft: { md: '1px solid #e2e8f0' },
                p: 3
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 2
                }}
              >
                Permission Preview
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                  pb: 2,
                  borderBottom: '1px solid #e2e8f0'
                }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: selectedRoleInfo.color
                  }}
                />
                <Typography fontWeight={700} color="#1e293b">
                  {selectedRoleInfo.displayName}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(selectedRoleInfo?.permissions || []).map((perm) => (
                  <Box
                    key={perm.key}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.5
                    }}
                  >
                    {perm.allowed ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: '#10b981' }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: 18, color: '#ef4444' }} />
                    )}
                    <Typography
                      sx={{
                        color: perm.allowed ? '#374151' : '#9ca3af',
                        fontSize: '0.9rem'
                      }}
                    >
                      {perm.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {selectedEvents.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      mb: 1
                    }}
                  >
                    Access to {selectedEvents.length} event(s)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedEvents.slice(0, 3).map((eventId) => {
                      const event = events.find(e => e.id === eventId);
                      return (
                        <Chip
                          key={eventId}
                          label={event?.name || eventId}
                          size="small"
                          sx={{ 
                            backgroundColor: '#ddd6fe',
                            color: '#5b21b6',
                            fontSize: '0.75rem'
                          }}
                        />
                      );
                    })}
                    {selectedEvents.length > 3 && (
                      <Chip
                        label={`+${selectedEvents.length - 3} more`}
                        size="small"
                        sx={{ 
                          backgroundColor: '#e2e8f0',
                          color: '#64748b',
                          fontSize: '0.75rem'
                        }}
                      />
                    )}
                  </Box>
                </>
              )}
            </Paper>
          </Box>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0' }}>
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{ 
              textTransform: 'none',
              color: '#64748b',
              fontWeight: 600
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
            sx={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              textTransform: 'none',
              px: 4,
              py: 1.2,
              fontWeight: 700,
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
              }
            }}
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
