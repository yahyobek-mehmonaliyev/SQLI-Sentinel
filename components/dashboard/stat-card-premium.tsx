import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardPremiumProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    label: string;
  };
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'critical' | 'success' | 'warning';
  animated?: boolean;
}

export function StatCardPremium({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  onClick,
  className,
  variant = 'default',
  animated = false,
}: StatCardPremiumProps) {
  const variantStyles = {
    default: 'border-border/50 hover:border-primary/30',
    critical: 'border-critical/30 hover:border-critical/50',
    success: 'border-success/30 hover:border-success/50',
    warning: 'border-warning/30 hover:border-warning/50',
  };

  const trendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend?.direction === 'up' ? 'text-success' : 'text-error';

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-lg shadow-lg hover:shadow-2xl p-6 cursor-pointer group transition-all duration-300',
        variantStyles[variant],
        animated && 'pulse-active',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {React.createElement(trendIcon, {
              className: cn('h-4 w-4', trendColor),
            })}
            <span className={cn('text-xs font-semibold', trendColor)}>
              {trend.direction === 'up' ? '+' : ''}{trend.value}%
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-bold text-foreground">{value}</h3>
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </div>

      {trend && <p className="text-xs text-muted-foreground mt-4">{trend.label}</p>}
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'critical' | 'success' | 'warning';
}

export function MiniStat({ label, value, variant = 'default' }: MiniStatProps) {
  const variantStyles = {
    default: 'bg-muted/10 text-muted-foreground',
    critical: 'bg-critical/10 text-critical',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div className={cn('rounded-lg p-3 text-center', variantStyles[variant])}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
