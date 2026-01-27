import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import InviteUserModal from './InviteUserModal';
import { invitationService, RolePermissions } from '../services/invitationService';
import { useApp } from '../context/AppContext';

export default function InvitedUsersPanel() {
  const { organization } = useApp();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      loadInvitations();
    }
  }, [organization?.id]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await invitationService.getOrganizationInvitations(organization.id);
      setInvitations(data);
    } catch (err) {
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) return;
    
    try {
      await invitationService.cancelInvitation(invitationId);
      loadInvitations();
    } catch (err) {
      setError('Failed to cancel invitation');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />;
      case 'pending':
        return <HourglassEmptyIcon sx={{ color: '#f59e0b', fontSize: 20 }} />;
      case 'cancelled':
      case 'expired':
        return <CancelIcon sx={{ color: '#ef4444', fontSize: 20 }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return { bg: '#dcfce7', color: '#166534' };
      case 'pending': return { bg: '#fef3c7', color: '#92400e' };
      case 'cancelled': return { bg: '#fee2e2', color: '#991b1b' };
      case 'expired': return { bg: '#f3f4f6', color: '#6b7280' };
      default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  return (
    <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1e293b">
              Invited Users
            </Typography>
            <Typography color="#64748b" fontSize="0.9rem">
              Manage user invitations to your organization
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={loadInvitations}
              sx={{ border: '1px solid #e2e8f0' }}
            >
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setInviteModalOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '10px',
                px: 3
              }}
            >
              Invite User
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#7c3aed' }} />
          </Box>
        ) : invitations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <PersonAddIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
            <Typography color="#64748b">
              No invitations yet. Invite users to collaborate on your events.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Events</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Sent</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((invitation) => {
                  const roleInfo = RolePermissions[invitation.role];
                  const statusColors = getStatusColor(invitation.status);
                  
                  return (
                    <TableRow key={invitation.id} hover>
                      <TableCell>
                        <Typography fontWeight={600} color="#1e293b">
                          {invitation.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={roleInfo?.displayName || invitation.role}
                          size="small"
                          sx={{
                            backgroundColor: roleInfo?.color + '20',
                            color: roleInfo?.color,
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${invitation.event_ids?.length || 0} events`}
                          size="small"
                          sx={{
                            backgroundColor: '#f3e8ff',
                            color: '#7c3aed'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(invitation.status)}
                          <Chip
                            label={invitation.status}
                            size="small"
                            sx={{
                              backgroundColor: statusColors.bg,
                              color: statusColors.color,
                              fontWeight: 600,
                              textTransform: 'capitalize'
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography color="#64748b" fontSize="0.85rem">
                          {formatDate(invitation.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {invitation.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Resend invitation">
                              <IconButton size="small" sx={{ color: '#3b82f6' }}>
                                <SendIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel invitation">
                              <IconButton
                                size="small"
                                sx={{ color: '#ef4444' }}
                                onClick={() => handleCancelInvitation(invitation.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      <InviteUserModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={loadInvitations}
      />
    </Card>
  );
}
