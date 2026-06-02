/**
 * SQLI Sentinel Premium Color System
 * Semantic color definitions for consistent theming
 */

export const colors = {
  // Core palette
  background: '#0a0e27',
  foreground: '#e8ecf1',

  // Surface hierarchy
  card: '#141829',
  elevated: '#1a1f35',
  muted: '#2d3a52',
  mutedForeground: '#8b92a9',

  // Accent colors
  primary: '#00d9ff',
  secondary: '#06f59c',
  accent: '#00d9ff',

  // Severity levels
  critical: {
    color: '#ef4444',
    bg: '#7f1d1d',
    border: '#dc2626',
  },
  high: {
    color: '#f97316',
    bg: '#7c2d12',
    border: '#ea580c',
  },
  medium: {
    color: '#eab308',
    bg: '#713f12',
    border: '#d97706',
  },
  low: {
    color: '#22c55e',
    bg: '#164e63',
    border: '#16a34a',
  },

  // Status indicators
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  running: '#00d9ff',

  // Structural
  border: '#2d3a52',
  borderSubtle: '#1f2937',
  borderFocus: '#00d9ff',
  input: '#1a1f35',
  inputBorder: '#2d3a52',
  ring: '#00d9ff',
};

/**
 * Get severity color by level
 */
export function getSeverityColor(level: 'critical' | 'high' | 'medium' | 'low'): typeof colors.critical {
  return colors[level];
}

/**
 * Get severity class for styling
 */
export function getSeverityClass(level: string): string {
  const classes: Record<string, string> = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  };
  return classes[level] || 'badge-medium';
}

/**
 * Get status color
 */
export function getStatusColor(status: 'running' | 'success' | 'error' | 'warning' | 'pending'): string {
  const colors: Record<string, string> = {
    running: '#00d9ff',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    pending: '#9ca3af',
  };
  return colors[status] || colors.pending;
}

/**
 * Chart color palette for visualizations
 */
export const chartColors = {
  primary: '#00d9ff',
  secondary: '#06f59c',
  tertiary: '#f97316',
  quaternary: '#3b82f6',
  quinary: '#8b5cf6',
  senary: '#ec4899',
};

/**
 * Get chart color by index
 */
export function getChartColor(index: number): string {
  const colors = Object.values(chartColors);
  return colors[index % colors.length];
}

/**
 * Gradient definitions for premium aesthetics
 */
export const gradients = {
  primary: 'from-primary via-primary/60 to-background',
  secondary: 'from-secondary via-secondary/60 to-background',
  critical: 'from-critical via-critical/60 to-background',
  neon: 'from-primary via-secondary to-critical',
};

/**
 * Shadow system
 */
export const shadows = {
  subtle: '0 1px 2px rgba(0, 0, 0, 0.05)',
  soft: '0 4px 6px rgba(0, 0, 0, 0.1)',
  medium: '0 10px 15px rgba(0, 0, 0, 0.15)',
  strong: '0 20px 25px rgba(0, 0, 0, 0.2)',
  glow: '0 0 24px rgba(0, 217, 255, 0.25)',
  glowGreen: '0 0 24px rgba(6, 245, 156, 0.25)',
  glowCritical: '0 0 24px rgba(239, 68, 68, 0.25)',
};

/**
 * Determine if severity is critical (for highlighting)
 */
export function isCriticalSeverity(level: string): boolean {
  return level.toLowerCase() === 'critical';
}

/**
 * Get contrasting text color for background
 */
export function getContrastColor(background: string): 'text-white' | 'text-black' {
  // Simple luminance calculation
  const hex = background.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'text-black' : 'text-white';
}
