/**
 * Role Badge Component
 * Visual indicator for user roles
 */

import React from 'react';
import { Roles } from '../services/rbacService';

const roleConfig = {
  [Roles.SUPER_ADMIN]: {
    label: 'Super Admin',
    color: '#dc2626',
    bgColor: '#fee2e2',
    icon: '👑'
  },
  [Roles.EVENT_ADMIN]: {
    label: 'Event Admin',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    icon: '🎪'
  },
  [Roles.JUDGE]: {
    label: 'Judge',
    color: '#0891b2',
    bgColor: '#cffafe',
    icon: '⚖️'
  },
  [Roles.VIEWER]: {
    label: 'Viewer',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: '👁️'
  }
};

function RoleBadge({ role, size = 'medium', showIcon = true }) {
  const config = roleConfig[role] || roleConfig[Roles.VIEWER];
  
  const sizeStyles = {
    small: { padding: '2px 6px', fontSize: '11px' },
    medium: { padding: '4px 10px', fontSize: '13px' },
    large: { padding: '6px 14px', fontSize: '15px' }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: config.bgColor,
        color: config.color,
        borderRadius: '6px',
        fontWeight: '600',
        ...sizeStyles[size]
      }}
    >
      {showIcon && <span>{config.icon}</span>}
      {config.label}
    </span>
  );
}

export default RoleBadge;
