import React from 'react';
import { X, Copy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TerminalLine {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  message: string;
  details?: string;
}

interface TerminalPanelProps {
  title?: string;
  lines: TerminalLine[];
  onClear?: () => void;
  className?: string;
  maxHeight?: string;
  autoScroll?: boolean;
  showTimestamp?: boolean;
}

export function TerminalPanel({
  title = 'Terminal Output',
  lines,
  onClear,
  className,
  maxHeight = 'max-h-96',
  autoScroll = true,
  showTimestamp = true,
}: TerminalPanelProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const getLevelColor = (level: TerminalLine['level']) => {
    const colors = {
      info: 'text-primary/80',
      success: 'text-success/80',
      warning: 'text-warning/80',
      error: 'text-error/80',
      debug: 'text-muted-foreground/80',
    };

    return colors[level] ?? colors.debug;
  };

  const getLevelPrefix = (level: TerminalLine['level']) => {
    const prefixes = {
      info: '[INFO]',
      success: '[OK]',
      warning: '[WARN]',
      error: '[ERR]',
      debug: '[DEBUG]',
    };

    return prefixes[level] ?? '[LOG]';
  };

  const serializeLines = () =>
    lines.map((line) => `${line.timestamp} ${getLevelPrefix(line.level)} ${line.message}`).join('\n');

  return (
    <div className={cn('rounded-2xl border border-primary/20 bg-card/85 backdrop-blur-xl', className)}>
      <div className="flex items-center justify-between border-b border-border/40 p-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex gap-2">
          {onClear && (
            <button
              onClick={onClear}
              className="rounded-lg p-2 transition-colors hover:bg-muted/30"
              title="Terminalni tozalash"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(serializeLines())}
            className="rounded-lg p-2 transition-colors hover:bg-muted/30"
            title="Natijani nusxalash"
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className={cn('overflow-y-auto p-4 font-mono text-xs leading-relaxed', maxHeight)}>
        {lines.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground/50">Natijalar kutilmoqda...</div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="terminal-line">
              {showTimestamp && <span className="w-32 flex-shrink-0 text-muted-foreground/60">{line.timestamp}</span>}
              <span className={cn('w-14 flex-shrink-0', getLevelColor(line.level))}>{getLevelPrefix(line.level)}</span>
              <div className="flex-1 break-all">
                <span className="text-primary/90">{line.message}</span>
                {line.details && <div className="mt-1 ml-4 text-muted-foreground/70">{line.details}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/40 bg-black/20 px-4 py-2">
        <span className="text-xs text-muted-foreground">{lines.length} ta satr</span>
        <button
          onClick={() => {
            const link = document.createElement('a');
            link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(serializeLines())}`;
            link.download = 'terminal-output.log';
            link.click();
          }}
          className="flex items-center gap-1 text-xs text-primary/70 transition-colors hover:text-primary"
        >
          <Download className="h-3 w-3" />
          Eksport
        </button>
      </div>
    </div>
  );
}
