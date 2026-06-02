# SQLI Sentinel Premium - Integration Guide

## Quick Start

The premium refinement has been completed with a production-ready design system, component library, and enhanced styling. Follow this guide to integrate the new components into existing pages.

## New Components Available

### 1. Skeleton Loaders
```tsx
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonChart } from '@/components/ui/skeleton';

// Simple skeleton
<Skeleton variant="text" />

// Card skeleton
<SkeletonCard />

// Table skeleton
<SkeletonTable />

// Chart skeleton
<SkeletonChart />
```

Use these in data-fetching scenarios to show loading states.

### 2. Empty States
```tsx
import { EmptyState, EmptyStateTable } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';

// Custom empty state
<EmptyState
  icon={Inbox}
  title="No scans yet"
  description="Start your first SQL Injection scan"
  action={{
    label: "New Scan",
    onClick: () => navigateTo('/scanner')
  }}
/>

// Table empty state
<EmptyStateTable />
```

### 3. Premium Badges
```tsx
import {
  SeverityBadge,
  ConfidenceBadge,
  StatusBadge,
  VulnerabilityTypeBadge,
  EnvironmentBadge
} from '@/components/ui/badge-premium';

// Severity
<SeverityBadge level="critical" />

// Confidence with score
<ConfidenceBadge level="high" score={92} />

// Status with animation
<StatusBadge status="running" animated />

// Vulnerability type
<VulnerabilityTypeBadge type="union" />

// Environment
<EnvironmentBadge env="prod" />
```

### 4. Premium Stat Cards
```tsx
import { StatCardPremium, MiniStat } from '@/components/dashboard/stat-card-premium';
import { ShieldAlert } from 'lucide-react';

// Full stat card
<StatCardPremium
  title="Critical Vulnerabilities"
  value={8}
  icon={ShieldAlert}
  variant="critical"
  trend={{
    direction: 'up',
    value: 5,
    label: 'Last 7 days'
  }}
/>

// Mini stat
<MiniStat label="Success Rate" value="94%" variant="success" />
```

### 5. Terminal Panel
```tsx
import { TerminalPanel, TerminalLine } from '@/components/dashboard/terminal-panel';

const logs: TerminalLine[] = [
  {
    id: '1',
    timestamp: '14:32:05',
    level: 'info',
    message: 'Scan started on target.com'
  },
  {
    id: '2',
    timestamp: '14:32:06',
    level: 'success',
    message: 'SQLi detected in id parameter'
  }
];

<TerminalPanel
  title="Scan Log"
  lines={logs}
  onClear={() => setLogs([])}
  showTimestamp
/>
```

### 6. Chart Cards
```tsx
import { ChartCard, StatsGrid, DataMetric } from '@/components/dashboard/chart-card';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';

// Chart with card styling
<ChartCard
  title="Scan Performance"
  description="Weekly statistics"
  tooltip="Data from past 7 days"
>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <Bar dataKey="scans" fill="#00d9ff" />
    </BarChart>
  </ResponsiveContainer>
</ChartCard>

// Stats grid
<StatsGrid columns={4} gap="lg">
  <StatCardPremium {...props} />
  <StatCardPremium {...props} />
</StatsGrid>

// Data metrics
<DataMetric label="Success Rate" value="94%" change={{ value: 5, direction: 'up' }} />
```

## CSS Classes Reference

### Card Styles
```css
.card-base           /* Basic card */
.card-elevated       /* Card with shadow */
.card-glass          /* Glass-morphism effect */
.card-minimal        /* Minimal border only */
```

### Button Variants
```css
.btn-primary         /* Primary action */
.btn-secondary       /* Secondary action */
.btn-outline         /* Outlined button */
.btn-ghost           /* Ghost button */
```

### Badge Classes
```css
.badge-critical      /* Critical severity */
.badge-high          /* High severity */
.badge-medium        /* Medium severity */
.badge-low           /* Low severity */
.badge-success       /* Success state */
.badge-warning       /* Warning state */

.status-running      /* Running status */
.status-success      /* Success status */
.status-error        /* Error status */
```

### Terminal Styles
```css
.terminal-panel      /* Terminal container */
.terminal-line       /* Individual log line */
.terminal-prompt     /* Command prompt */
```

### Animations
```css
.pulse-active        /* Active pulse */
.pulse-danger        /* Danger pulse ring */
.glow-primary        /* Primary glow */
.glow-secondary      /* Secondary glow */
.glow-critical       /* Critical glow */
.shimmer             /* Loading shimmer */
.fade-in             /* Fade in */
.slide-up            /* Slide up */
.slide-down          /* Slide down */
.scale-pop           /* Pop scale */
```

## Color System Utilities

```tsx
import {
  colors,
  getSeverityColor,
  getSeverityClass,
  getStatusColor,
  chartColors,
  getChartColor
} from '@/lib/premium-colors';

// Access colors
const bgColor = colors.background;
const criticalColor = colors.critical.color;

// Get severity styling
const sevClass = getSeverityClass('high');

// Get status color
const runningColor = getStatusColor('running');

// Chart colors
const color1 = chartColors.primary;
const dynamicColor = getChartColor(0);
```

## Integration Steps

### Step 1: Update Existing Pages
Replace old stat cards with `StatCardPremium`:
```tsx
// Before
<StatCard title="..." value={123} icon={Icon} />

// After
<StatCardPremium title="..." value={123} icon={Icon} variant="default" />
```

### Step 2: Add Loading States
Wrap data sections with skeleton loaders:
```tsx
{loading ? <SkeletonTable /> : <VulnerabilityTable data={data} />}
```

### Step 3: Add Empty States
Include empty states in all lists:
```tsx
{data.length === 0 ? (
  <EmptyState icon={Inbox} title="No data" />
) : (
  <DataTable data={data} />
)}
```

### Step 4: Enhance Badges
Replace inline severity with `SeverityBadge`:
```tsx
// Before
<span className="text-red-500">Critical</span>

// After
<SeverityBadge level="critical" />
```

### Step 5: Add Terminal for Logs
Use `TerminalPanel` in monitor/log pages:
```tsx
<TerminalPanel title="Scan Log" lines={logs} />
```

## Theme Customization

Edit CSS variables in `app/globals.css` .dark selector:
```css
.dark {
  --primary: #00d9ff;
  --secondary: #06f59c;
  --critical: #ef4444;
  /* ... more variables */
}
```

## Performance Tips

1. **Use Skeleton Loaders** - Prevent layout shift during loading
2. **Lazy Load Charts** - Import chart components dynamically
3. **Memoize Components** - Use React.memo for chart wrappers
4. **Debounce Searches** - Prevent excessive re-renders
5. **Paginate Tables** - Large datasets should be paginated

## Accessibility

All components include:
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Focus states (.focus-ring class)
- Proper color contrast
- Screen reader text (.sr-only class)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires CSS Grid, Flexbox, Custom Properties

## Troubleshooting

### Styles not applying
Check that `app/globals.css` is imported in `layout.tsx`

### Colors not matching
Ensure you're using CSS variables from `.dark` selector

### Animations laggy
Use transform/opacity properties instead of position changes

### Components not found
Verify import paths match actual file locations

## Next Steps

1. Create new pages (Scan History, API, Audit Log)
2. Integrate existing data with new components
3. Add real-time updates with WebSockets
4. Implement data export features
5. Add advanced filtering and search
6. Create comparison views
7. Add custom report generation
8. Implement notification system

---

For detailed component documentation, see individual component files and JSDoc comments.
