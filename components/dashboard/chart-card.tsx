import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  tooltip?: string;
  footer?: React.ReactNode;
  variant?: 'default' | 'accent' | 'critical';
}

export function ChartCard({
  title,
  description,
  children,
  loading = false,
  className,
  tooltip,
  footer,
  variant = 'default',
}: ChartCardProps) {
  const variantStyles = {
    default: 'border-border/50',
    accent: 'border-primary/30',
    critical: 'border-critical/30',
  };

  return (
    <div className={cn('bg-card border border-border rounded-lg shadow-lg hover:shadow-2xl p-6', variantStyles[variant], className)}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {tooltip && (
              <div className="group relative">
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-muted text-foreground text-xs rounded px-3 py-2 whitespace-nowrap z-10 shadow-lg">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>

      <div className="w-full">
        {loading ? (
          <Skeleton variant="chart" className="h-64" />
        ) : (
          children
        )}
      </div>

      {footer && (
        <div className="mt-6 pt-6 border-t border-border/40">
          {footer}
        </div>
      )}
    </div>
  );
}

interface StatsGridProps {
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function StatsGrid({ columns = 4, gap = 'md', children }: StatsGridProps) {
  const columnClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns];

  const gapClass = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];

  return <div className={cn('grid', columnClass, gapClass)}>{children}</div>;
}

interface ChartGridProps {
  layout?: 'single' | '2-1' | '1-1-2' | '3-column';
  children: React.ReactNode;
}

export function ChartGrid({ layout = 'single', children }: ChartGridProps) {
  const layoutClass = {
    single: 'grid-cols-1',
    '2-1': 'grid-cols-1 lg:grid-cols-3',
    '1-1-2': 'grid-cols-1 lg:grid-cols-2',
    '3-column': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[layout];

  return <div className={cn('grid gap-6', layoutClass)}>{children}</div>;
}

interface DataMetricProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down';
  };
  variant?: 'default' | 'highlight' | 'warning' | 'critical';
}

export function DataMetric({ label, value, change, variant = 'default' }: DataMetricProps) {
  const variantStyles = {
    default: 'text-muted-foreground',
    highlight: 'text-primary',
    warning: 'text-warning',
    critical: 'text-critical',
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/10 border border-border/20">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('font-semibold text-lg', variantStyles[variant])}>{value}</span>
        {change && (
          <span className={cn('text-xs font-medium', change.direction === 'up' ? 'text-success' : 'text-error')}>
            {change.direction === 'up' ? '+' : '-'}{change.value}%
          </span>
        )}
      </div>
    </div>
  );
}
