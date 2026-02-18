/**
 * Event Status Badge Component
 * Visual indicator for event lifecycle states
 */

import React from 'react';
import { EventStatus } from '../services/eventLifecycleService';

const statusConfig = {
  [EventStatus.DRAFT]: {
    label: 'Draft',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: '\u25CB'
  },
  [EventStatus.LIVE_JUDGING]: {
    label: 'Live Judging',
    color: '#059669',
    bgColor: '#d1fae5',
    icon: '\u25CF'
  },
  [EventStatus.LOCKED]: {
    label: 'Locked',
    color: '#d97706',
    bgColor: '#fef3c7',
    icon: '\u25A0'
  },
  [EventStatus.PUBLISHED]: {
    label: 'Published',
    color: '#2563eb',
    bgColor: '#dbeafe',
    icon: '\u2713'
  }
};

function EventStatusBadge({ status, size = 'medium', showIcon = true }) {
  const config = statusConfig[status] || statusConfig[EventStatus.DRAFT];
  
  const sizeStyles = {
    small: { padding: '4px 8px', fontSize: '12px' },
    medium: { padding: '6px 12px', fontSize: '14px' },
    large: { padding: '8px 16px', fontSize: '16px' }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: config.bgColor,
        color: config.color,
        borderRadius: '9999px',
        fontWeight: '600',
        ...sizeStyles[size]
      }}
    >
      {showIcon && <span>{config.icon}</span>}
      {config.label}
    </span>
  );
}

export default EventStatusBadge;
