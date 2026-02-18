/**
 * Grant Access Modal
 * Allows admins to grant existing users access to events directly
 */

import React, { useState, useEffect } from 'react';
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
  FormHelperText,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Chip
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { RolePermissions } from '../services/invitationService';
import { auditService, AuditActions } from '../services/auditService';

export default function GrantAccessModal({ open, onClose, onSuccess, organizationId }) {
  const { organization } = useApp();
  const resolvedOrgId = organizationId || organization?.id;

  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('event_admin');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && resolvedOrgId) {
      loadEvents();
      resetForm();
    }
  }, [open, resolvedOrgId]);

  const resetForm = () => {
    setEmail('');
    setSelectedRole('event_admin');
    setSelectedEvents([]);
    setError(null);
    setSuccess(false);
  };

  const loadEvents = async () => {
    if (!resolvedOrgId) return;
    
    setLoadingEvents(true);
    try {
      const { data, error: eventsError } = await supabase
        .from('events')
        .select('id, name, status')
        .eq('organization_id', resolvedOrgId)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(data || []);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Please select at least one event');
      return;
    }
    if (!resolvedOrgId) {
      setError('Organization context is missing');
      return;
    }

    setLoading(true);

    try {
      // Grant access to each selected event
      const results = [];
      for (const eventId of selectedEvents) {
        const { data, error: rpcError } = await supabase.rpc('grant_event_access', {
          p_user_email: email.trim().toLowerCase(),
          p_event_id: eventId,
          p_role: selectedRole,
          p_organization_id: resolvedOrgId
        });

        if (rpcError) throw rpcError;
        
        if (!data?.success) {
          throw new Error(data?.error || 'Failed to grant access');
        }
        
        results.push({ eventId, success: true });
      }

      setSuccess(true);
      
      // Notify parent of success
      if (onSuccess) {
        onSuccess();
      }

      // Close modal after brief delay
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);

    } catch (err) {
      console.error('Error granting access:', err);
      setError(err.message || 'Failed to grant access');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleInfo = RolePermissions[selectedRole];

  if (success) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 6 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: '#10b981', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} color="#1e293b" mb={1}>
            Access Granted!
          </Typography>
          <Typography color="#64748b">
            {email} now has access to {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <PersonAddIcon />
        Grant Event Access
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {/* Left Column - Form */}
            <Box>
              <TextField
                fullWidth
                label="User Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
                helperText="Enter the email of an existing user"
                sx={{ mb: 3 }}
              />

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  label="Role"
                >
                  {Object.entries(RolePermissions).map(([key, info]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: info.color
                          }}
                        />
                        {info.displayName}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{selectedRoleInfo?.description}</FormHelperText>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Events</InputLabel>
                <Select
                  multiple
                  value={selectedEvents}
                  onChange={(e) => setSelectedEvents(e.target.value)}
                  label="Events"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((eventId) => {
                        const event = events.find(e => e.id === eventId);
                        return (
                          <Chip
                            key={eventId}
                            label={event?.name || eventId}
                            size="small"
                            sx={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}
                          />
                        );
                      })}
                    </Box>
                  )}
                  disabled={loadingEvents}
                >
                  {loadingEvents ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Loading events...
                    </MenuItem>
                  ) : events.length === 0 ? (
                    <MenuItem disabled>No events found</MenuItem>
                  ) : (
                    events.map((event) => (
                      <MenuItem key={event.id} value={event.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {event.name}
                          <Chip
                            label={event.status || 'draft'}
                            size="small"
                            sx={{
                              ml: 'auto',
                              fontSize: '0.7rem',
                              height: '20px',
                              backgroundColor: event.status === 'live_judging' ? '#fef3c7' : '#e0e7ff',
                              color: event.status === 'live_judging' ? '#92400e' : '#4338ca'
                            }}
                          />
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
                <FormHelperText>
                  Select one or more events to grant access to
                </FormHelperText>
              </FormControl>
            </Box>

            {/* Right Column - Preview */}
            <Box
              sx={{
                backgroundColor: '#f8fafc',
                borderRadius: 2,
                p: 3,
                border: '1px solid #e2e8f0'
              }}
            >
              <Typography variant="subtitle2" color="#64748b" mb={2}>
                Access Preview
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="#94a3b8" fontSize="0.75rem">
                  ROLE
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: selectedRoleInfo?.color
                    }}
                  />
                  <Typography fontWeight={600} color="#1e293b">
                    {selectedRoleInfo?.displayName}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="#94a3b8" fontSize="0.75rem" mb={1}>
                  PERMISSIONS
                </Typography>
                {(selectedRoleInfo?.permissions || [])
                  .filter(p => p.allowed)
                  .map((perm) => (
                    <Box
                      key={perm.key}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 14, color: '#10b981' }} />
                      <Typography variant="body2" color="#374151">
                        {perm.label}
                      </Typography>
                    </Box>
                  ))}
              </Box>

              <Box>
                <Typography variant="body2" color="#94a3b8" fontSize="0.75rem" mb={1}>
                  SELECTED EVENTS ({selectedEvents.length})
                </Typography>
                {selectedEvents.length === 0 ? (
                  <Typography variant="body2" color="#9ca3af" fontStyle="italic">
                    No events selected
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedEvents.map((eventId) => {
                      const event = events.find(e => e.id === eventId);
                      return (
                        <Chip
                          key={eventId}
                          label={event?.name || eventId}
                          size="small"
                          sx={{
                            backgroundColor: '#dbeafe',
                            color: '#1d4ed8',
                            fontWeight: 500
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => { onClose(); resetForm(); }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || selectedEvents.length === 0}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
            sx={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
              }
            }}
          >
            {loading ? 'Granting...' : 'Grant Access'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
