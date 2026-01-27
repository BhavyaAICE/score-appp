/**
 * User Management Page
 * Shows organization members and invited users (not all database users)
 * Super Admin interface for managing access and invitations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Roles } from '../services/rbacService';
import { invitationService, RolePermissions } from '../services/invitationService';
import { accessService } from '../services/accessService';
import RoleBadge from '../components/RoleBadge';
import InviteUserModal from '../components/InviteUserModal';
import GrantAccessModal from '../components/GrantAccessModal';
import { supabase } from '../supabaseClient';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteIcon from '@mui/icons-material/Delete';

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <>
    {/* Header Skeleton */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div>
        <div style={{ height: '28px', width: '280px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '6px', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ height: '16px', width: '200px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '4px', marginTop: '8px', animation: 'shimmer 1.5s infinite' }} />
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ height: '44px', width: '120px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '10px', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ height: '44px', width: '120px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '10px', animation: 'shimmer 1.5s infinite' }} />
      </div>
    </div>

    {/* Stats Skeleton */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ height: '36px', width: '60px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '6px', animation: 'shimmer 1.5s infinite' }} />
          <div style={{ height: '14px', width: '100px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '4px', marginTop: '8px', animation: 'shimmer 1.5s infinite' }} />
        </div>
      ))}
    </div>

    {/* Search Skeleton */}
    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
      <div style={{ height: '44px', flex: 1, maxWidth: '320px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '8px', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: '44px', width: '140px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '8px', animation: 'shimmer 1.5s infinite' }} />
    </div>

    {/* Table Skeleton */}
    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ height: '24px', width: '180px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '6px', marginBottom: '20px', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: '48px', background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', borderRadius: '8px', marginBottom: '12px', animation: 'shimmer 1.5s infinite' }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: '60px', background: 'linear-gradient(90deg, #f8fafc 25%, #fff 50%, #f8fafc 75%)', borderRadius: '6px', marginBottom: '8px', animation: 'shimmer 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>

    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </>
);

function UserManagement() {
  const { user, userProfile, organization } = useApp();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGrantAccessModal, setShowGrantAccessModal] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  // If the profile isn't linked to an org yet, allow Super/Co Admins to pick one.
  const [orgOptions, setOrgOptions] = useState([]);
  const [orgOptionsLoading, setOrgOptionsLoading] = useState(false);
  const [orgOptionsError, setOrgOptionsError] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  const effectiveOrgId = organization?.id ?? selectedOrgId;

  useEffect(() => {
    // Wait for userProfile to be loaded before checking permissions
    if (!userProfile) {
      return;
    }

    if (userProfile.role !== Roles.SUPER_ADMIN && userProfile.role !== Roles.CO_ADMIN) {
      navigate('/unauthorized');
      return;
    }
  }, [userProfile, navigate]);

  const loadOrganizations = useCallback(async () => {
    if (organization?.id) return;

    setOrgOptionsLoading(true);
    setOrgOptionsError(null);
    try {
      const { data, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(50);

      if (orgError) throw orgError;
      const list = data || [];
      setOrgOptions(list);

      // Auto-select the first available org to skip the picker
      if (!selectedOrgId && list.length > 0) {
        setSelectedOrgId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading organizations:', err);
      setOrgOptionsError(err?.message || 'Failed to load organizations');
    } finally {
      setOrgOptionsLoading(false);
    }
  }, [organization?.id, selectedOrgId]);

  useEffect(() => {
    if (!userProfile) return;
    if (organization?.id) return;
    if (userProfile.role !== Roles.SUPER_ADMIN && userProfile.role !== Roles.CO_ADMIN) return;

    loadOrganizations();
  }, [userProfile?.id, organization?.id, loadOrganizations]);

  // Load data once we have an org context (from profile, or selected via picker)
  useEffect(() => {
    if (!userProfile) return;
    if (!effectiveOrgId) return;

    if (userProfile.role === Roles.SUPER_ADMIN || userProfile.role === Roles.CO_ADMIN) {
      loadData(effectiveOrgId);
    }
  }, [effectiveOrgId, userProfile?.id]);

  const loadData = async (orgId = effectiveOrgId) => {
    if (!orgId) return;

    setLoading(true);
    try {
      // Load organization members (users with event_access in this org)
      const { data: accessData, error: accessError } = await supabase
        .from('event_access')
        .select(`
          id,
          role,
          created_at,
          user_id,
          event_id,
          events (name)
        `)
        .eq('organization_id', orgId);

      if (accessError) throw accessError;

      // Get unique user IDs
      const userIds = [...new Set(accessData?.map(a => a.user_id) || [])];

      // Get user profiles for these users
      let profiles = [];
      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, is_active, last_login_at')
          .in('id', userIds);

        if (profileError) throw profileError;
        profiles = profileData || [];
      }

      // Combine member data with their event access
      const memberMap = {};
      profiles.forEach(p => {
        memberMap[p.id] = {
          ...p,
          events: [],
          roles: new Set()
        };
      });

      accessData?.forEach(a => {
        if (memberMap[a.user_id]) {
          memberMap[a.user_id].events.push({
            id: a.event_id,
            name: a.events?.name,
            role: a.role
          });
          memberMap[a.user_id].roles.add(a.role);
        }
      });

      setMembers(Object.values(memberMap).map(m => ({
        ...m,
        roles: Array.from(m.roles)
      })));

      // Load invitations
      const invitationsData = await invitationService.getOrganizationInvitations(orgId);
      setInvitations(invitationsData || []);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId) => {
    setResendingId(invitationId);
    try {
      await invitationService.resendInvitation(invitationId);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to cancel this invitation?')) return;
    
    try {
      await invitationService.cancelInvitation(invitationId);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevokeAccess = async (member, event) => {
    if (!window.confirm(`Revoke ${member.full_name || member.email}'s access to ${event.name}?`)) return;
    
    setRevokingId(event.accessId);
    try {
      await accessService.revokeAccess(event.accessId);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to revoke access');
    } finally {
      setRevokingId(null);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredInvitations = invitations.filter(inv => {
    const matchesSearch = inv.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  const acceptedCount = invitations.filter(i => i.status === 'accepted').length;

  // Show skeleton while userProfile is loading
  if (!userProfile) {
    return (
      <div style={containerStyle}>
        <LoadingSkeleton />
      </div>
    );
  }

  // If no org context and still loading orgs, show skeleton
  if (!effectiveOrgId && orgOptionsLoading) {
    return (
      <div style={containerStyle}>
        <LoadingSkeleton />
      </div>
    );
  }

  // If no org is available at all (user has no access to any org)
  if (!effectiveOrgId && !orgOptionsLoading && orgOptions.length === 0) {
    return (
      <div style={containerStyle}>
        <header style={headerStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#1e3a5f' }}>
              Team & Access Management
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
              Manage your organization members and invitations
            </p>
          </div>
          <button onClick={() => navigate('/admin/events')} style={backBtnStyle}>
            Back to Events
          </button>
        </header>

        <div style={sectionStyle}>
          <div style={emptyStateStyle}>
            <p style={{ marginBottom: '16px' }}>
              No organization found for your account. Please contact an administrator to get access.
            </p>
            <button onClick={loadOrganizations} style={refreshBtnStyle}>
              <RefreshIcon style={{ fontSize: '18px' }} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e3a5f' }}>
            Team & Access Management
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
            Manage who has access to your events and their roles
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowGrantAccessModal(true)}
            style={grantAccessBtnStyle}
          >
            <SecurityIcon style={{ fontSize: '20px' }} />
            Grant Access
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            style={inviteBtnStyle}
          >
            <PersonAddIcon style={{ fontSize: '20px' }} />
            Invite User
          </button>
          <button
            onClick={() => navigate('/admin/events')}
            style={backBtnStyle}
          >
            Back to Events
          </button>
        </div>
      </header>

      {error && (
        <div style={errorStyle}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '12px', cursor: 'pointer', background: 'none', border: 'none', color: '#dc2626' }}>
            ✕
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={statsStyle}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#2563eb' }}>
            {members.length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Active Members</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>
            {pendingCount}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Pending Invitations</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>
            {acceptedCount}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Accepted</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>
            {invitations.length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Invitations</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={filtersStyle}>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <button onClick={loadData} style={refreshBtnStyle}>
          <RefreshIcon style={{ fontSize: '18px' }} />
        </button>
      </div>

      {/* Active Members Section */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <CheckCircleIcon style={{ color: '#10b981', fontSize: '20px' }} />
          Active Members ({filteredMembers.length})
        </h2>
        
        {filteredMembers.length === 0 ? (
          <div style={emptyStateStyle}>
            <p>No active members yet. Invite users to give them access to your events.</p>
          </div>
        ) : (
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
                  <th style={{ ...thStyle, color: '#fff' }}>User</th>
                  <th style={{ ...thStyle, color: '#fff' }}>Roles</th>
                  <th style={{ ...thStyle, color: '#fff' }}>Events Access</th>
                  <th style={{ ...thStyle, color: '#fff' }}>Status</th>
                  <th style={{ ...thStyle, color: '#fff' }}>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tdStyle}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e3a5f' }}>
                          {member.full_name || 'No name'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {member.email}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {member.roles.map(role => (
                          <RoleBadge key={role} role={role} size="small" />
                        ))}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {member.events.slice(0, 3).map(e => (
                          <span key={e.id} style={eventChipStyle}>{e.name}</span>
                        ))}
                        {member.events.length > 3 && (
                          <span style={{ ...eventChipStyle, background: '#e2e8f0' }}>
                            +{member.events.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={activeStatusStyle}>Active</span>
                    </td>
                    <td style={tdStyle}>
                      {member.last_login_at 
                        ? new Date(member.last_login_at).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invitations Section */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <EmailIcon style={{ color: '#7c3aed', fontSize: '20px' }} />
          Invitations ({filteredInvitations.length})
        </h2>

        {filteredInvitations.length === 0 ? (
          <div style={emptyStateStyle}>
            <p>No invitations sent yet. Click "Invite User" to get started.</p>
          </div>
        ) : (
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Events</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Sent</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvitations.map((inv) => {
                  const roleInfo = RolePermissions[inv.role] || {};
                  const isExpired = new Date(inv.expires_at) < new Date();
                  const status = isExpired && inv.status === 'pending' ? 'expired' : inv.status;
                  
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '500', color: '#1e3a5f' }}>
                          {inv.email}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: roleInfo.color ? `${roleInfo.color}15` : '#f3f4f6',
                          color: roleInfo.color || '#6b7280'
                        }}>
                          {roleInfo.displayName || inv.role}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: '#6b7280', fontSize: '13px' }}>
                          {inv.event_ids?.length || 0} event(s)
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {status === 'pending' && (
                          <span style={pendingStatusStyle}>
                            <PendingIcon style={{ fontSize: '14px' }} /> Pending
                          </span>
                        )}
                        {status === 'accepted' && (
                          <span style={acceptedStatusStyle}>
                            <CheckCircleIcon style={{ fontSize: '14px' }} /> Accepted
                          </span>
                        )}
                        {status === 'cancelled' && (
                          <span style={cancelledStatusStyle}>
                            <CancelIcon style={{ fontSize: '14px' }} /> Cancelled
                          </span>
                        )}
                        {status === 'expired' && (
                          <span style={expiredStatusStyle}>Expired</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td style={tdStyle}>
                        {inv.status === 'pending' && !isExpired && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleResendInvitation(inv.id)}
                              disabled={resendingId === inv.id}
                              style={actionBtnStyle}
                            >
                              {resendingId === inv.id ? '...' : 'Resend'}
                            </button>
                            <button
                              onClick={() => handleCancelInvitation(inv.id)}
                              style={{ ...actionBtnStyle, color: '#dc2626' }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <InviteUserModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setShowInviteModal(false);
          loadData();
        }}
        organizationId={effectiveOrgId}
      />

      {/* Grant Access Modal */}
      <GrantAccessModal
        open={showGrantAccessModal}
        onClose={() => setShowGrantAccessModal(false)}
        onSuccess={() => {
          setShowGrantAccessModal(false);
          loadData();
        }}
        organizationId={effectiveOrgId}
      />
    </div>
  );
}

const containerStyle = {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: '24px'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  flexWrap: 'wrap',
  gap: '16px'
};

const inviteBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 20px',
  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
};

const grantAccessBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 20px',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
};

const backBtnStyle = {
  padding: '12px 20px',
  background: '#f1f5f9',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  color: '#475569'
};

const refreshBtnStyle = {
  padding: '12px',
  background: '#f1f5f9',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#64748b'
};

const errorStyle = {
  padding: '12px 16px',
  background: '#fee2e2',
  color: '#dc2626',
  borderRadius: '8px',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const statsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
  marginBottom: '24px'
};

const statCardStyle = {
  background: '#fff',
  padding: '20px',
  borderRadius: '12px',
  textAlign: 'center',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
};

const filtersStyle = {
  display: 'flex',
  gap: '12px',
  marginBottom: '24px',
  flexWrap: 'wrap'
};

const searchInputStyle = {
  flex: 1,
  minWidth: '200px',
  padding: '12px 16px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '14px'
};

const selectStyle = {
  padding: '12px 16px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '14px',
  minWidth: '150px',
  background: '#fff'
};

const sectionStyle = {
  marginBottom: '32px'
};

const sectionTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: '600',
  color: '#1e3a5f',
  marginBottom: '16px'
};

const emptyStateStyle = {
  background: '#fff',
  padding: '40px',
  borderRadius: '12px',
  textAlign: 'center',
  color: '#6b7280',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
};

const tableContainerStyle = {
  background: '#fff',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  overflow: 'hidden'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse'
};

const thStyle = {
  padding: '14px 16px',
  textAlign: 'left',
  fontWeight: '600',
  color: '#374151',
  fontSize: '13px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const tdStyle = {
  padding: '16px',
  color: '#4b5563'
};

const eventChipStyle = {
  padding: '2px 8px',
  background: '#f3e8ff',
  color: '#7c3aed',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: '500'
};

const activeStatusStyle = {
  padding: '4px 10px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: '600',
  background: '#d1fae5',
  color: '#059669'
};

const pendingStatusStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: '600',
  background: '#fef3c7',
  color: '#d97706'
};

const acceptedStatusStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: '600',
  background: '#d1fae5',
  color: '#059669'
};

const cancelledStatusStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: '600',
  background: '#fee2e2',
  color: '#dc2626'
};

const expiredStatusStyle = {
  padding: '4px 10px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontWeight: '600',
  background: '#f3f4f6',
  color: '#6b7280'
};

const actionBtnStyle = {
  padding: '6px 12px',
  background: '#f3f4f6',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
  color: '#374151'
};

export default UserManagement;
