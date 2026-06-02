// SQLI Sentinel Constants

export const APP_NAME = 'SQLI Sentinel';
export const APP_DESCRIPTION = 'Avtomatlashtirilgan SQL Injection Aniqlash Platformasi';

export const PAYLOAD_TYPES = {
  ERROR_BASED: 'Error-based',
  UNION_BASED: 'Union-based',
  BOOLEAN_BASED: 'Boolean-based',
  TIME_BASED: 'Time-based',
} as const;

export const SEVERITY_LEVELS = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const;

export const SCAN_STATUS = {
  PENDING: 'pending',
  SCANNING: 'scanning',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const PAYLOAD_STRATEGIES = {
  CONSERVATIVE: 'conservative',
  BALANCED: 'balanced',
  AGGRESSIVE: 'aggressive',
} as const;

export const RISK_SCORING_MODELS = {
  STANDARD: 'standard',
  OWASP: 'owasp',
  CVSS: 'cvss',
} as const;

export const NAVIGATION_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Scanner',
    href: '/scanner',
    icon: 'Crosshair',
  },
  {
    label: 'Payloads',
    href: '/payloads',
    icon: 'Wand2',
  },
  {
    label: 'Monitor',
    href: '/monitor',
    icon: 'Monitor',
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: 'BarChart3',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: 'FileText',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'Settings',
  },
] as const;

export const UZEK_TRANSLATIONS = {
  // Common
  welcome: 'Xush kelibsiz',
  search: 'Qidirish',
  save: 'Saqlash',
  cancel: 'Bekor qilish',
  delete: 'O\'chirish',
  edit: 'Tahrirlash',
  export: 'Eksport',
  import: 'Import',
  download: 'Yuklab olish',
  upload: 'Yuklash',
  
  // SQL Injection Types
  errorBased: 'Error-based SQLi',
  unionBased: 'Union-based SQLi',
  booleanBased: 'Boolean-based SQLi',
  timeBased: 'Time-based blind SQLi',
  
  // Severity
  critical: 'Juda Xavfli',
  high: 'Yuqori Xavf',
  medium: 'O\'rtacha Xavf',
  low: 'Past Xavf',
  
  // Dashboard
  totalScans: 'Umumiy Skanirish',
  detectedVulnerabilities: 'Aniqlangan Xavflar',
  successRate: 'Muvaffaqiyat Darajasi',
  averageResponseTime: 'O\'rtacha Javob Vaqti',
  
  // Scanner
  targetUrl: 'Maqsad URL',
  parameters: 'Parametrlar',
  scanDepth: 'Skanirish Chuqurligi',
  payloadStrategy: 'Payload Strategiyasi',
  startScan: 'Skanirish Boshlash',
  stopScan: 'Skanirish To\'xtash',
  
  // Payloads
  payloadLibrary: 'Payload Kutubxonasi',
  activePayloads: 'Aktiv Payloads',
  totalPayloads: 'Umumiy Payloads',
  payloadSuccessRate: 'Muvaffaqiyat Darajasi',
} as const;

