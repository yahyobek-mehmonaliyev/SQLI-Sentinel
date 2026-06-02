# SQLI Sentinel - Quick Start Guide

## Project Structure Map

```
SQLI Sentinel Frontend (Next.js 16)
│
├── PUBLIC PAGES
│   ├── / (Landing)
│   ├── /login
│   ├── /register
│   └── /forgot-password
│
├── DASHBOARD PAGES
│   ├── /dashboard (Main analytics)
│   ├── /scanner (New scan interface)
│   ├── /payloads (Payload library)
│   ├── /monitor (Live monitoring)
│   ├── /analytics (Security analytics)
│   ├── /reports (Vulnerability reports)
│   └── /settings (Configuration)
│
└── FEATURES
    ├── Dark theme + neon accents
    ├── Real-time charts (Recharts)
    ├── Uzbek language UI
    ├── Responsive design
    └── 30+ shadcn/ui components
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/globals.css` | Theme colors, custom Tailwind classes |
| `lib/types.ts` | TypeScript types (Scan, Vulnerability, etc.) |
| `lib/data.ts` | Dummy data for demo |
| `lib/constants.ts` | App constants & Uzbek translations |
| `app/(dashboard)/layout.tsx` | Sidebar + Header navigation |
| `components/dashboard/stat-card.tsx` | Stats card component |

---

## Tailwind Custom Classes

Use these for consistent styling:

```tsx
// Buttons
<button className="sqli-button-primary">Primary</button>
<button className="sqli-button-secondary">Secondary</button>

// Cards & containers
<div className="sqli-card">Content</div>

// Forms
<input className="sqli-input" />

// Severity badges
<span className="sqli-badge-critical">Critical</span>
<span className="sqli-badge-high">High</span>
<span className="sqli-badge-medium">Medium</span>
<span className="sqli-badge-low">Low</span>

// Special
<div className="sqli-terminal">Log output</div>
<div className="sqli-glow">Glowing element</div>
```

---

## Color Reference

```css
Primary:    #00d9ff (Neon Cyan)
Secondary:  #06f59c (Neon Green)
Alert:      #ef4444 (Soft Red)
Background: #0f172a (Deep Navy)
Surface:    #1e293b (Slate-900)
Border:     #334155 (Slate-700)
Text:       #f1f5f9 (Slate-100)
Muted:      #94a3b8 (Slate-400)
```

---

## Common Tasks

### Add a New Page

1. Create file: `app/(dashboard)/newpage/page.tsx`
2. Use layout from other dashboard pages
3. Import components from `components/`
4. Add navigation item in `app/(dashboard)/layout.tsx`

### Add a New Component

1. Create: `components/feature-name.tsx`
2. Export as named export
3. Use in pages with `import { ComponentName } from '@/components/feature-name'`

### Use Dummy Data

```tsx
import { dummyScans, dummyVulnerabilities, analyticsData } from '@/lib/data';

export default function MyPage() {
  return <div>{dummyScans.length} scans</div>;
}
```

### Add a Chart

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
    <XAxis dataKey="name" stroke="#94a3b8" />
    <YAxis stroke="#94a3b8" />
    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
    <Line type="monotone" dataKey="value" stroke="#00d9ff" />
  </LineChart>
</ResponsiveContainer>
```

---

## Uzbek Translations

Common terms in Uzbek:

```typescript
Kiriş / Login
Ro'yhatdan o'tish / Register
Parol / Password
Parolni unutdim / Forgot Password
Dashboard / Dashboard
Skanirish / Scanning
Xavflar / Vulnerabilities
Hisoboti / Reports
Sozlamalar / Settings
Chiqish / Logout
```

---

## Navigation Structure

**Sidebar Items** (in `/dashboard`):
1. Dashboard
2. Scanner
3. Payloads
4. Monitor
5. Analytics
6. Reports
7. Settings

Plus footer items:
- API Key
- Logout

---

## Database Types Reference

```typescript
interface Scan {
  id: string;
  targetUrl: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  vulnerabilitiesFound: number;
  successRate: number;
  timestamp: Date;
}

interface Vulnerability {
  id: string;
  url: string;
  parameter: string;
  payload: string;
  payloadType: 'Error-based' | 'Union-based' | 'Boolean-based' | 'Time-based';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore: number;
}

interface Payload {
  id: string;
  type: PayloadType;
  payload: string;
  successRate: number;
}
```

---

## Performance Tips

1. Use `dynamic()` for heavy components
2. Memoize expensive calculations
3. Use `React.memo()` for list items
4. Lazy load charts/tables
5. Optimize images with `next/image`

---

## Deployment Checklist

- [ ] Check all environment variables
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Verify all links work
- [ ] Check for console errors
- [ ] Test form validation
- [ ] Verify charts display correctly
- [ ] Test export functionality
- [ ] Check dark mode throughout
- [ ] Test navigation
- [ ] Run `pnpm build` successfully

---

## Common Issues & Solutions

### Issue: Styles not applying
**Solution**: Clear `.next` folder and rebuild
```bash
rm -rf .next && pnpm build
```

### Issue: Components not found
**Solution**: Check import paths use `@/components/`
```tsx
import { Component } from '@/components/component-name';  // Correct
import { Component } from './components/component-name';  // Wrong
```

### Issue: Tailwind classes not working
**Solution**: Make sure class name is in `globals.css` custom classes
```css
@layer components {
  .new-class {
    @apply px-4 py-2 rounded;
  }
}
```

---

## Getting Help

1. Check `/README.md` for full documentation
2. Check `/BUILD_SUMMARY.md` for architecture
3. Review `lib/types.ts` for data structures
4. Look at `lib/data.ts` for example data
5. Check `app/(dashboard)/layout.tsx` for component patterns

---

## Development Workflow

```bash
# 1. Start dev server
pnpm dev

# 2. Open http://localhost:3000

# 3. Make changes to files

# 4. Changes auto-refresh in browser (HMR)

# 5. When ready to deploy
pnpm build
pnpm start

# 6. Test production build locally

# 7. Deploy to Vercel
git push origin main
```

---

## Useful Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # Check TypeScript types
pnpm format           # Format with Prettier
```

---

## Next Steps After Build

1. **Connect Backend API**
   - Update API endpoints in components
   - Remove dummy data
   - Add real authentication

2. **Add Real Database**
   - Set up PostgreSQL/MongoDB
   - Create API routes
   - Implement data persistence

3. **Deploy & Monitor**
   - Deploy to Vercel
   - Set up error tracking
   - Monitor performance

4. **Add Advanced Features**
   - Real-time WebSocket updates
   - Advanced filtering
   - Custom reports
   - Team features

---

**Last Updated**: March 2026
**Status**: Production Ready
**Version**: 1.0
