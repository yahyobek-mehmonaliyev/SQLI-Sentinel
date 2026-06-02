import React from 'react';
import { cn } from '@/lib/utils';

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
type ConfidenceLevel = 'high' | 'medium' | 'low';
type StatusType = 'running' | 'success' | 'error' | 'warning' | 'pending';

interface SeverityBadgeProps {
  level: SeverityLevel;
  className?: string;
}

export function SeverityBadge({ level, className }: SeverityBadgeProps) {
  const severityMap = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  };

  const labels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  return (
    <div className={cn(severityMap[level], className)}>
      {labels[level]}
    </div>
  );
}

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  score?: number;
  className?: string;
}

export function ConfidenceBadge({ level, score, className }: ConfidenceBadgeProps) {
  const colors = {
    high: 'bg-success/15 text-success border-success/30',
    medium: 'bg-warning/15 text-warning border-warning/30',
    low: 'bg-error/15 text-error border-error/30',
  };

  const labels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  return (
    <div className={cn('px-3 py-1 rounded-full text-xs font-semibold border', colors[level], className)}>
      {labels[level]} {score && `(${score}%)`}
    </div>
  );
}

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
  animated?: boolean;
}

export function StatusBadge({ status, label, className, animated = false }: StatusBadgeProps) {
  const statusMap = {
    running: 'status-running',
    success: 'status-success',
    error: 'status-error',
    warning: 'status-warning',
    pending: 'status-pending',
  };

  const labels = {
    running: 'Running',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    pending: 'Pending',
  };

  return (
    <div
      className={cn(
        'status-indicator',
        statusMap[status],
        animated && status === 'running' && 'pulse-active',
        className
      )}
    >
      <div className={cn('h-2 w-2 rounded-full', {
        'bg-running': status === 'running',
        'bg-success': status === 'success',
        'bg-error': status === 'error',
        'bg-warning': status === 'warning',
        'bg-muted': status === 'pending',
      })} />
      {label || labels[status]}
    </div>
  );
}

interface VulnerabilityTypeBadgeProps {
  type: 'union' | 'error' | 'boolean' | 'time-blind' | 'stacked';
  className?: string;
}

export function VulnerabilityTypeBadge({ type, className }: VulnerabilityTypeBadgeProps) {
  const types = {
    union: { label: 'Union-based', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    error: { label: 'Error-based', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    boolean: { label: 'Boolean-based', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
    'time-blind': { label: 'Time-based Blind', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
    stacked: { label: 'Stacked Queries', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  };

  const typeData = types[type];

  return (
    <div className={cn('px-3 py-1 rounded-full text-xs font-semibold border', typeData.color, className)}>
      {typeData.label}
    </div>
  );
}

interface EnvironmentBadgeProps {
  env: 'dev' | 'staging' | 'prod';
  className?: string;
}

export function EnvironmentBadge({ env, className }: EnvironmentBadgeProps) {
  const envMap = {
    dev: { label: 'Development', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    staging: { label: 'Staging', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
    prod: { label: 'Production', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  };

  const envData = envMap[env];

  return (
    <div className={cn('px-3 py-1 rounded-full text-xs font-semibold border', envData.color, className)}>
      {envData.label}
    </div>
  );
}
