'use client'

import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Loader2,
  Globe,
  KeyRound,
  FileCode,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface MatchedRule {
  rule: string
  label: string
  description: string
  matchCount: number
  weight: number
}

interface Vulnerability {
  type: string
  severity: string
  parameter: string
  description: string
  rule: string
  matchCount: number
}

interface ScanResult {
  detected: boolean
  riskScore: number
  severity: string
  vulnerabilities: Vulnerability[]
  signals: string[]
  matchedRules: MatchedRule[]
  analysis: string
  scanTimeMs: number
  targetUrl: string
  paramName: string
  paramValue: string
}

const QUICK_PAYLOADS = [
  { label: "OR 1=1", param: 'id', value: "1' OR 1=1 --", danger: true },
  { label: "UNION SELECT", param: 'id', value: "' UNION SELECT username, password FROM users --", danger: true },
  { label: "DROP TABLE", param: 'id', value: "'; DROP TABLE users; --", danger: true },
  { label: "SLEEP()", param: 'id', value: "' OR SLEEP(5) --", danger: true },
  { label: "info_schema", param: 'id', value: "' UNION SELECT table_name FROM information_schema.tables --", danger: true },
  { label: "Hex encoded", param: 'id', value: "admin' AND 0x61646D696E --", danger: true },
  { label: "Xavfsiz qiymat", param: 'id', value: '3', danger: false },
  { label: "Murakkab SQLi", param: 'id', value: "1' AND (SELECT COUNT(*) FROM information_schema.tables) > 0; SLEEP(3) --", danger: true },
]

function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'Critical': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' }
    case 'High': return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' }
    case 'Medium': return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' }
    default: return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' }
  }
}

function RiskCircle({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 85) return '#ef4444'
    if (score >= 65) return '#f97316'
    if (score >= 40) return '#eab308'
    return '#22c55e'
  }
  const getRiskLabel = () => {
    if (score >= 85) return 'KRITIK XAVF'
    if (score >= 65) return 'YUQORI XAVF'
    if (score >= 40) return "O'RTA XAVF"
    if (score >= 15) return 'PAST XAVF'
    return 'XAVFSIZ'
  }
  const circumference = 2 * Math.PI * 42
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={getColor()} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color: getColor() }}>{score}</span>
        </div>
      </div>
      <span className="text-xs font-bold tracking-widest" style={{ color: getColor() }}>
        {getRiskLabel()}
      </span>
    </div>
  )
}

function VulnItem({ vuln, index }: { vuln: Vulnerability; index: number }) {
  const [open, setOpen] = useState(false)
  const s = getSeverityStyle(vuln.severity)

  return (
    <div
      className="rounded-xl border border-destructive/15 bg-destructive/5 p-3 transition-all hover:border-destructive/30"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${s.bg} ${s.color} ${s.border} border`}>
            {vuln.severity}
          </span>
          <div>
            <p className="text-sm font-semibold">{vuln.type}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{vuln.parameter} parametri</p>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      {open && (
        <p className="mt-2.5 rounded-lg border border-border/50 bg-black/20 p-2.5 text-xs text-muted-foreground">
          {vuln.description}
        </p>
      )}
    </div>
  )
}

export default function ScannerPage() {
  const [url, setUrl] = useState('https://talim-tahlil.vercel.app/login')
  const [paramName, setParamName] = useState('id')
  const [paramValue, setParamValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  const handleScan = useCallback(async (overrideParam?: string, overrideValue?: string) => {
    const targetUrl = url.trim()
    if (!targetUrl) { setError('URL kiritilmagan.'); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await apiFetch<ScanResult>('/scan-url', {
        method: 'POST',
        body: JSON.stringify({
          target_url: targetUrl,
          param_name: overrideParam ?? paramName,
          param_value: overrideValue ?? paramValue,
        }),
      })
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Skanerlashda xatolik yuz berdi.")
    } finally {
      setLoading(false)
    }
  }, [url, paramName, paramValue])

  const handleQuick = (param: string, value: string) => {
    setParamName(param)
    setParamValue(value)
    handleScan(param, value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Crosshair className="h-7 w-7 text-primary" />
          URL Skaner
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Maqsad URL va parametrlarni kiriting — tizim SQL injection zaifliklarini aniqlaydi.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        {/* Left — Form */}
        <div className="space-y-5">
          <Card className="sqli-card">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70">
              <Globe className="h-4 w-4" />
              Skanerlash sozlamalari
            </div>

            {/* URL */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Maqsad URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="sqli-input w-full pl-9 font-mono text-sm"
                  placeholder="https://example.com/login"
                />
              </div>
            </div>

            {/* Param Name */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Parametr nomi</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  value={paramName}
                  onChange={(e) => setParamName(e.target.value)}
                  className="sqli-input w-full pl-9 font-mono text-sm"
                  placeholder="id, username, search..."
                />
              </div>
            </div>

            {/* Param Value */}
            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Parametr qiymati</label>
              <div className="relative">
                <FileCode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                <textarea
                  value={paramValue}
                  onChange={(e) => setParamValue(e.target.value)}
                  rows={3}
                  className="sqli-input w-full resize-none pl-9 font-mono text-sm"
                  placeholder={"' OR 1=1 --"}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Scan Button */}
            <Button
              onClick={() => handleScan()}
              disabled={loading || !url.trim()}
              className="sqli-button-primary h-11 w-full"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Skanerlanmoqda...</>
              ) : (
                <><Crosshair className="mr-2 h-4 w-4" />Skanerlash</>
              )}
            </Button>

            {/* Quick Payloads */}
            <div className="mt-5 border-t border-border/50 pt-4">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Tez test payloadlar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PAYLOADS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handleQuick(p.param, p.value)}
                    disabled={loading}
                    className={`rounded-md border px-2.5 py-1 font-mono text-[10px] transition-all hover:-translate-y-0.5 disabled:opacity-50 ${
                      p.danger
                        ? 'border-destructive/15 bg-destructive/5 text-red-400 hover:border-destructive/30 hover:bg-destructive/10'
                        : 'border-green-500/15 bg-green-500/5 text-green-400 hover:border-green-500/30 hover:bg-green-500/10'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right — Results */}
        <div className="space-y-5">
          {result ? (
            <>
              {/* Status + Risk */}
              <Card className={`sqli-card border ${result.detected ? 'border-destructive/25' : 'border-green-500/25'}`}>
                <div className="flex items-center gap-6">
                  <RiskCircle score={result.riskScore} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      {result.detected ? (
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                      )}
                      <h3 className={`text-lg font-bold ${result.detected ? 'text-destructive' : 'text-green-500'}`}>
                        {result.detected ? 'SQL Injection aniqlandi!' : 'Xavfsiz'}
                      </h3>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {result.vulnerabilities.length} ta zaiflik
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {result.scanTimeMs}ms
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {result.matchedRules.length} pattern
                      </span>
                    </div>
                    {/* Risk bar */}
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${result.riskScore}%`,
                          background: result.riskScore >= 85 ? '#ef4444' : result.riskScore >= 65 ? '#f97316' : result.riskScore >= 40 ? '#eab308' : '#22c55e',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Analysis */}
              <Card className="sqli-card">
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                  Tahlil natijasi
                </h3>
                <p className="rounded-xl border border-primary/15 bg-primary/5 p-3.5 text-sm leading-relaxed text-muted-foreground">
                  {result.analysis}
                </p>
              </Card>

              {/* Signals */}
              {result.signals.length > 0 && (
                <Card className="sqli-card">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                    <Globe className="h-3.5 w-3.5" />
                    URL signallari ({result.signals.length})
                  </h3>
                  <div className="space-y-1.5">
                    {result.signals.map((sig, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-yellow-500/5 p-2.5 text-xs text-yellow-400/80">
                        <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                        {sig}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Vulnerabilities */}
              {result.vulnerabilities.length > 0 && (
                <Card className="sqli-card">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-destructive/70">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Topilgan zaifliklar ({result.vulnerabilities.length})
                  </h3>
                  <div className="space-y-2">
                    {result.vulnerabilities.map((vuln, i) => (
                      <VulnItem key={`${vuln.rule}-${i}`} vuln={vuln} index={i} />
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="sqli-card">
              <div className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Crosshair className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="font-semibold">Natija kutilmoqda</h3>
                <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                  URL va parametrlarni kiritib &quot;Skanerlash&quot; tugmasini bosing yoki tez test payloadlardan birini tanlang.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
