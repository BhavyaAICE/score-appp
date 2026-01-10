/**
 * User Management Page
 * Super Admin interface for managing users and roles
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { rbacService, Roles } from '../services/rbacService';
import RoleBadge from '../components/RoleBadge';
import { supabase } from '../supabaseClient';

function UserManagement() {
  const { user, userProfile, hasPermission } = useApp();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    if (userProfile?.role !== Roles.SUPER_ADMIN) {
      navigate('/unauthorized');
      return;
    }
    loadUsers();
  }, [userProfile, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await rbacService.updateUserRole(userId, newRole, user.id);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    try {
      await supabase
        .from('user_profiles')
        .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
        .eq('id', userId);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e3a5f' }}>
            User Management
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
            Manage user accounts and role assignments
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/events')}
          style={backBtnStyle}
        >
          Back to Events
        </button>
      </header>

      {error && (
        <div style={errorStyle}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '12px', cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

      <div style={filtersStyle}>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Roles</option>
          <option value={Roles.SUPER_ADMIN}>Super Admin</option>
          <option value={Roles.EVENT_ADMIN}>Event Admin</option>
          <option value={Roles.JUDGE}>Judge</option>
          <option value={Roles.VIEWER}>Viewer</option>
        </select>
      </div>

      <div style={statsStyle}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#2563eb' }}>
            {users.length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Users</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>
            {users.filter(u => u.role === Roles.SUPER_ADMIN).length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Super Admins</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>
            {users.filter(u => u.role === Roles.EVENT_ADMIN).length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Event Admins</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#0891b2' }}>
            {users.filter(u => u.role === Roles.JUDGE).length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Judges</div>
        </div>
      </div>

      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Last Login</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e3a5f' }}>
                        {u.full_name || 'No name'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {u.email}
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {editingUser === u.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          style={{ ...selectStyle, width: 'auto' }}
                        >
                          <option value={Roles.SUPER_ADMIN}>Super Admin</option>
                          <option value={Roles.EVENT_ADMIN}>Event Admin</option>
                          <option value={Roles.JUDGE}>Judge</option>
                          <option value={Roles.VIEWER}>Viewer</option>
                        </select>
                        <button
                          onClick={() => handleRoleChange(u.id, newRole)}
                          style={{ ...actionBtnStyle, background: '#10b981', color: '#fff' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          style={actionBtnStyle}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <RoleBadge role={u.role} size="small" />
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: u.is_active ? '#d1fae5' : '#fee2e2',
                      color: u.is_active ? '#059669' : '#dc2626'
                    }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {u.last_login_at 
                      ? new Date(u.last_login_at).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setEditingUser(u.id);
                          setNewRole(u.role);
                        }}
                        style={actionBtnStyle}
                        disabled={u.id === user.id}
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        style={{
                          ...actionBtnStyle,
                          color: u.is_active ? '#dc2626' : '#059669'
                        }}
                        disabled={u.id === user.id}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
  marginBottom: '24px'
};

const backBtnStyle = {
  padding: '10px 20px',
  background: '#f1f5f9',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  color: '#475569'
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

const filtersStyle = {
  display: 'flex',
  gap: '16px',
  marginBottom: '24px'
};

const searchInputStyle = {
  flex: 1,
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
  minWidth: '150px'
};

const statsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
  padding: '16px',
  textAlign: 'left',
  fontWeight: '600',
  color: '#374151',
  borderBottom: '2px solid #e5e7eb'
};

const tdStyle = {
  padding: '16px',
  color: '#4b5563'
};

const actionBtnStyle = {
  padding: '6px 12px',
  background: '#f3f4f6',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500'
};

export default UserManagement;
