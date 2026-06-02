import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'centered' | 'compact';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const containerClass = {
    default: 'py-16 text-center',
    centered: 'py-24 text-center flex flex-col items-center justify-center min-h-96',
    compact: 'py-8 text-center',
  }[variant];

  return (
    <div className={containerClass}>
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-lg bg-muted/30 mb-6 border border-border/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      
      {description && (
        <p className="text-muted-foreground max-w-sm mx-auto mb-6">{description}</p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary inline-flex items-center justify-center"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function EmptyStateTable() {
  return (
    <div className="card-elevated p-12 text-center">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-lg bg-muted/30 mb-4 border border-border/50">
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No data to display</h3>
      <p className="text-muted-foreground text-sm">
        Start a new scan or adjust your filters to see results
      </p>
    </div>
  );
}
