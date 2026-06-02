import { cn } from '@/lib/utils';

interface SkeletonProps extends React.ComponentProps<'div'> {
  variant?: 'card' | 'text' | 'circle' | 'table' | 'chart' | 'button';
  count?: number;
}

function Skeleton({ className, variant = 'text', count = 1, ...props }: SkeletonProps) {
  const baseClass = 'bg-muted/30 animate-pulse';

  const variants = {
    text: cn('h-4 w-full rounded-md', baseClass),
    card: cn('h-48 w-full rounded-lg', baseClass),
    circle: cn('h-12 w-12 rounded-full', baseClass),
    table: cn('space-y-3', baseClass),
    chart: cn('h-64 w-full rounded-lg', baseClass),
    button: cn('h-10 w-24 rounded-lg', baseClass),
  };

  const skeletonClass = cn(variants[variant], className);

  if (count > 1 && (variant === 'text' || variant === 'card')) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={skeletonClass} />
        ))}
      </div>
    );
  }

  return <div className={skeletonClass} {...props} />;
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-6 space-y-4">
      <Skeleton variant="text" className="h-6 w-1/3" />
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-5/6" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-6 space-y-4">
      <Skeleton variant="text" className="h-5 w-1/4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-border/40 last:border-0">
          <Skeleton variant="circle" className="h-10 w-10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" />
            <Skeleton variant="text" className="w-4/5" />
          </div>
          <Skeleton variant="button" className="w-20" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-6 space-y-4">
      <Skeleton variant="text" className="h-5 w-1/4" />
      <Skeleton variant="chart" />
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonChart };
