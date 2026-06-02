// SQLI Sentinel Types

export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed';
export type VulnerabilitySeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type PayloadType = 'Error-based' | 'Union-based' | 'Boolean-based' | 'Time-based';
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface Scan {
  id: string;
  targetUrl: string;
  status: ScanStatus;
  timestamp: Date;
  vulnerabilitiesFound: number;
  requestsTotal: number;
  successRate: number;
  duration: number;
  depth: number;
}

export interface Vulnerability {
  id: string;
  scanId: string;
  url: string;
  parameter: string;
  payload: string;
  payloadType: PayloadType;
  riskScore: number;
  severity: VulnerabilitySeverity;
  errorPattern: string;
  responseTime: number;
  timestamp: Date;
  evidence: string;
}

export interface Payload {
  id: string;
  type: PayloadType;
  payload: string;
  successRate: number;
  description: string;
  category: string;
  enabled: boolean;
  createdAt: Date;
}

export interface Request {
  id: string;
  scanId: string;
  method: RequestMethod;
  url: string;
  parameters: Record<string, string>;
  payload: string;
  response: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  detected: boolean;
}

export interface SystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  activeSessions: number;
  uptime: number;
  lastUpdate: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
  apiKey?: string;
  createdAt: Date;
}

export interface ScanSettings {
  timeout: number;
  requestRate: number;
  payloadStrategy: 'aggressive' | 'balanced' | 'conservative';
  riskScoringModel: 'standard' | 'owasp' | 'cvss';
  followRedirects: boolean;
  useRandomUserAgent: boolean;
}

export interface AnalyticsData {
  totalScans: number;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  averageResponseTime: number;
  successRate: number;
}
