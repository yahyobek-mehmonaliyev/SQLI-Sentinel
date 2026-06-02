import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  className = '',
}: StatCardProps) {
  return (
    <Card className={`sqli-card ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold">{value}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
      </div>
      {trendValue && (
        <div className="mt-4 flex items-center gap-1">
          {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-500" />}
          {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-destructive" />}
          <span
            className={`text-xs font-medium ${
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {trendValue}
          </span>
        </div>
      )}
    </Card>
  );
}
