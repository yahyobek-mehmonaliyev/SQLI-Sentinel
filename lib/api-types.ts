export interface UserDto {
  id: string
  email: string
  name: string
  role: string
}

export interface SessionDto {
  id: string
  expiresAt: string
}

export interface AuthSessionDto {
  user: UserDto
  session: SessionDto
  token?: string
}

export interface AnalyticsSnapshot {
  totalScans: number
  totalVulnerabilities: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  averageResponseTime: number
  successRate: number
}

export interface ScanDto {
  id: string
  targetUrl: string
  status: 'pending' | 'scanning' | 'completed' | 'failed'
  timestamp: string
  vulnerabilitiesFound: number
  requestsTotal: number
  successRate: number
  duration: number
  depth: number
  summary: string
  payloadStrategy: string
  followRedirects: boolean
  useRandomUserAgent: boolean
}

export interface ActivityDto {
  id: string
  type: string
  description: string
  status: string
  timestamp: string
}

export interface SystemStatusDto {
  cpuUsage: number
  memoryUsage: number
  activeSessions: number
  uptime: number
  lastUpdate: string
}

export interface PayloadDto {
  id: string
  type: 'Error-based' | 'Union-based' | 'Boolean-based' | 'Time-based'
  payload: string
  successRate: number
  description: string
  category: string
  enabled: boolean
  createdAt: string
}

export interface VulnerabilityDto {
  id: string
  scanId: string
  url: string
  parameter: string
  payload: string
  payloadType: string
  riskScore: number
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  errorPattern: string
  responseTime: number
  timestamp: string
  evidence: string
}

export interface RequestDto {
  id: string
  scanId: string
  method: string
  url: string
  parameters: Record<string, string>
  payload: string
  response: string
  responseTime: number
  statusCode: number
  timestamp: string
  detected: boolean
}

export interface SettingsDto {
  timeout: number
  requestRate: number
  payloadStrategy: 'conservative' | 'balanced' | 'aggressive'
  riskScoringModel: 'standard' | 'owasp' | 'cvss'
  followRedirects: boolean
  useRandomUserAgent: boolean
  verifySsl: boolean
  notifyCritical: boolean
  notifyScanComplete: boolean
  notifyWeekly: boolean
}

export interface ApiKeyPreviewDto {
  id: string
  name: string
  tokenPreview: string
  createdAt: string
}

export interface BreakdownItemDto {
  name: string
  count: number
}

export interface ScanOverviewDto {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  riskScore: number
  confidence: number
  averageResponseTime: number
  detectedSignals: number
  parameterCount: number
  affectedParameters: string[]
  parameterSummary: string[]
  categories: BreakdownItemDto[]
  severityBreakdown: BreakdownItemDto[]
  topFindings: VulnerabilityDto[]
  narrative: string
  importantNotes: string[]
}

export interface ScanDetailDto {
  scan: ScanDto
  parameters: Array<{ key: string; value: string; method: 'GET' | 'POST' }>
  requests: RequestDto[]
  vulnerabilities: VulnerabilityDto[]
  overview: ScanOverviewDto
}

export interface ScanCreateResponseDto {
  scan: ScanDto
  requests: number
  vulnerabilities: number
  overview: ScanOverviewDto
}

export interface AiRecommendationResponseDto {
  provider: string
  model: string
  recommendations: string[]
  context: {
    topFinding: VulnerabilityDto | null
    monitorItems: RequestDto[]
  }
}

export interface AiPromptOptimizationResponseDto {
  provider: string
  model: string
  optimizedPrompt: string
  improvements: string[]
}

export interface DetectMatchedRuleDto {
  rule: string
  label: string
  description: string
  matchCount: number
  weight: number
}

export interface DetectResponseDto {
  detected: boolean
  riskScore: number
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  matchedRules: DetectMatchedRuleDto[]
  analysis: string
  inputLength: number
}
