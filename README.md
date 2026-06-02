# SQLI Sentinel - Avtomatlashtirilgan SQL Injection Aniqlash Platformasi

Professional SQL Injection detection platform frontend built with Next.js 16, React 19, and TypeScript.

## Xususiyatlar

- **Professional Cybersecurity Dashboard** - Burp Suite va OWASP ZAP-ga ohshash interfeys
- **Real-time Monitoring** - So'rovlarni va payload ijroasini real vaqtda kuzatish
- **Comprehensive Reports** - Tafsil zaiflik hisobotlari va eksport
- **Advanced Analytics** - Xavf statistikasi va trend tahlili
- **Payload Library** - 30+ tayyor SQL Injection payload va custom payload qoʻshish
- **Dark Theme** - Professional cybersecurity dark theme with neon cyan/green accents
- **Uzbek Language** - Barcha content Uzbek tilida

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: TailwindCSS v4 + shadcn/ui
- **Charts**: Recharts
- **Icons**: Lucide Icons

## Directory Structure

```
app/
├── layout.tsx                 # Root layout
├── page.tsx                   # Landing page
├── globals.css                # Global styles & theme
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
└── (dashboard)/
    ├── layout.tsx             # Dashboard layout (sidebar + header)
    ├── dashboard/page.tsx     # Main dashboard
    ├── scanner/page.tsx       # Target scanner
    ├── payloads/page.tsx      # Payload library
    ├── monitor/page.tsx       # Live scan monitor
    ├── analytics/page.tsx     # Security analytics
    ├── reports/page.tsx       # Vulnerability reports
    └── settings/page.tsx      # Configuration

components/
├── dashboard/
│   └── stat-card.tsx          # Statistics card component
└── ui/                        # shadcn/ui components

lib/
├── types.ts                   # TypeScript types
├── data.ts                    # Dummy data for demo
└── constants.ts               # App constants

public/                        # Static assets
```

## Pages Overview

### 1. **Landing Page** (`/`)
- Product overview va features
- How it works section
- Security benefits
- Call-to-action buttons

### 2. **Authentication** (`/login`, `/register`, `/forgot-password`)
- JWT authentication UI
- Password visibility toggle
- Form validation
- Error handling

### 3. **Dashboard** (`/dashboard`)
- Key metrics (Total scans, Vulnerabilities, Success rate)
- Interactive charts
- Recent activity log
- System health status

### 4. **Scanner** (`/scanner`)
- URL input field
- Parameter manager
- Scan depth selector
- Payload strategy options
- Recent scans history

### 5. **Payloads** (`/payloads`)
- 30+ pre-built payloads
- Filter by type (Error-based, Union-based, Boolean-based, Time-based)
- Enable/disable payloads
- Copy to clipboard functionality

### 6. **Monitor** (`/monitor`)
- Real-time request logging
- Live response analysis
- Status indicators
- Detailed request information

### 7. **Analytics** (`/analytics`)
- Vulnerability distribution
- Scan timeline
- Payload effectiveness
- Risk scoring breakdown

### 8. **Reports** (`/reports`)
- Vulnerability cards with risk scores
- Filter by severity
- Detailed analysis
- Export to PDF/JSON/CSV

### 9. **Settings** (`/settings`)
- Scan timeout configuration
- Request rate limiter
- Payload strategy selection
- API key management
- Notification preferences

## Color Scheme

```css
Background: #0f172a (Deep Navy)
Card: #1e293b (Slate-900)
Border: #334155 (Slate-700)
Primary: #00d9ff (Neon Cyan)
Secondary: #06f59c (Neon Green)
Alert: #ef4444 (Soft Red)
Text: #f1f5f9 (Slate-100)
Muted: #94a3b8 (Slate-400)
```

## Dummy Data

The application comes with comprehensive dummy data:
- 5 sample scans with varied statuses
- 5 detected vulnerabilities with different severities
- 13 SQL injection payloads (Error-based, Union-based, Boolean-based, Time-based)
- Recent activity entries
- System health metrics

## Installation & Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Key Features

### 1. **Responsive Design**
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly interface

### 2. **Dark Mode**
- Professional cybersecurity dark theme
- Neon accents for better visibility
- Glowing effects on interactive elements

### 3. **Real-time Monitoring**
- Terminal-style log viewer
- Live response analysis
- Request filtering and search

### 4. **Advanced Analytics**
- Monthly scan trends
- Risk distribution charts
- Payload effectiveness analysis
- Detection rate tracking

### 5. **Export Capabilities**
- PDF report generation
- JSON data export
- CSV format support

## Component Library

### Core Components
- **StatCard** - Display statistics with trends
- **Dashboard Layout** - Sidebar + Header navigation
- **Form Inputs** - Custom styled input components
- **Cards** - SQLI-themed card components

### Custom Classes
- `.sqli-card` - Card styling
- `.sqli-button-primary` - Primary button
- `.sqli-button-secondary` - Secondary button
- `.sqli-input` - Input styling
- `.sqli-terminal` - Terminal-style viewer
- `.sqli-badge-*` - Severity badges
- `.sqli-glow` - Neon glow effect

## Deployment

Optimized for Vercel deployment:
- Next.js 16 Edge Runtime compatible
- Image optimization enabled
- No external Node.js dependencies in client
- Performance optimized

### Deploy to Vercel

```bash
git push origin main
```

## Future Enhancements

- Backend API integration
- WebSocket support for real-time updates
- Advanced payload customization
- Machine learning-based vulnerability detection
- Team collaboration features
- Advanced reporting with PDF generation
- API rate limiting visualization
- WAF bypass techniques

## License

Proprietary - SQLI Sentinel

## Support

For issues and support, contact the development team.
