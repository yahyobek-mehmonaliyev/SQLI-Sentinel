'use client'

import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  SearchCode,
  ShieldAlert,
  ShieldCheck,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  Copy,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { DetectResponseDto, DetectMatchedRuleDto } from '@/lib/api-types'

interface HistoryEntry {
  id: string
  input: string
  result: DetectResponseDto
  timestamp: Date
}

const QUICK_PAYLOADS = [
  { label: "' OR 1=1 --", value: "' OR 1=1 --", category: 'Boolean' },
  { label: 'UNION SELECT', value: "' UNION SELECT username, password FROM users --", category: 'Union' },
  { label: 'Stacked Query', value: "'; DROP TABLE users; --", category: 'Stacked' },
  { label: 'Time Delay', value: "' OR SLEEP(5) --", category: 'Time' },
  { label: 'Info Schema', value: "' UNION SELECT table_name FROM information_schema.tables --", category: 'Schema' },
  { label: 'Hex Encoded', value: "admin' AND 0x61646D696E --", category: 'Hex' },
  { label: 'Xavfsiz matn', value: 'Hello World! Bu oddiy matn.', category: 'Safe' },
  { label: 'Complex SQLi', value: "1' AND (SELECT COUNT(*) FROM information_schema.tables) > 0; SLEEP(3) --", category: 'Multi' },
]

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'Critical':
      return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: ShieldAlert, glow: 'shadow-red-500/20' }
    case 'High':
      return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle, glow: 'shadow-orange-500/20' }
    case 'Medium':
      return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertTriangle, glow: 'shadow-yellow-500/20' }
    default:
      return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle2, glow: 'shadow-green-500/20' }
  }
}

function RiskGauge({ score }: { score: number }) {
  const rotation = (score / 100) * 180 - 90
  const getColor = () => {
    if (score >= 85) return '#ef4444'
    if (score >= 65) return '#f97316'
    if (score >= 40) return '#eab308'
    return '#22c55e'
  }

  return (
    <div className="relative mx-auto h-28 w-56">
      <svg viewBox="0 0 200 110" className="h-full w-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="33%" stopColor="#eab308" />
            <stop offset="66%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 251.2} 251.2`}
          className="transition-all duration-1000 ease-out"
        />
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="30"
          stroke={getColor()}
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${rotation} 100 100)`}
          className="transition-all duration-1000 ease-out"
        />
        <circle cx="100" cy="100" r="6" fill={getColor()} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="text-3xl font-bold" style={{ color: getColor() }}>{score}</span>
        <span className="ml-1 text-sm text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

function MatchedRuleCard({ rule, index }: { rule: DetectMatchedRuleDto; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="group rounded-2xl border border-destructive/20 bg-destructive/5 p-4 transition-all duration-300 hover:border-destructive/40 hover:bg-destructive/10"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{rule.label}</p>
              <p className="text-xs text-muted-foreground">
                {rule.matchCount} ta mos kelish • Og&apos;irlik: {rule.weight}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 rounded-xl border border-border/50 bg-black/20 p-3">
          <p className="text-sm text-muted-foreground">{rule.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
              {rule.rule}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DetectorPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DetectResponseDto | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const handleDetect = useCallback(async (inputText?: string) => {
    const textToCheck = inputText ?? input
    if (!textToCheck.trim()) {
      setError('Iltimos, tekshirish uchun matn kiriting.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await apiFetch<DetectResponseDto>('/detect', {
        method: 'POST',
        body: JSON.stringify({ input: textToCheck }),
      })
      setResult(response)
      setHistory((prev) => [
        {
          id: `det-${Date.now()}`,
          input: textToCheck,
          result: response,
          timestamp: new Date(),
        },
        ...prev.slice(0, 19),
      ])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Tekshirishda xatolik yuz berdi.')
    } finally {
      setLoading(false)
    }
  }, [input])

  const handleQuickTest = (value: string) => {
    setInput(value)
    handleDetect(value)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const severityConfig = result ? getSeverityConfig(result.severity) : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-bold">
            <SearchCode className="h-8 w-8 text-primary" />
            SQL Injection Detector
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Matnni kiriting yoki paste qiling — tizim real-time rejimda SQL injection patternlarini aniqlaydi va xavf darajasini baholaydi.
          </p>
        </div>
        <Card className="sqli-card gap-2 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Qoidalar soni</p>
          <p className="text-2xl font-bold text-primary">7</p>
          <p className="text-xs text-muted-foreground">ta regex pattern tekshiriladi</p>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Left — Input & Controls */}
        <div className="space-y-6">
          <Card className="sqli-card">
            <div className="space-y-5">
              <div>
                <label className="mb-2 flex items-center justify-between text-sm font-semibold">
                  <span>Tekshirish uchun matn</span>
                  <span className="text-xs font-normal text-muted-foreground">{input.length} / 5000</span>
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={5000}
                  rows={6}
                  className="sqli-input w-full resize-none font-mono text-sm"
                  placeholder={"Matn kiriting, masalan:\n' OR 1=1 --\n' UNION SELECT * FROM users --\n1; DROP TABLE users; --"}
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row">
                <Button
                  onClick={() => handleDetect()}
                  disabled={loading || !input.trim()}
                  className="sqli-button-primary h-11 flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Tekshirilmoqda...
                    </>
                  ) : (
                    <>
                      <SearchCode className="mr-2 h-4 w-4" />
                      Tekshirish
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setInput(''); setResult(null); setError('') }}
                  className="h-11 border-border/80 bg-card/60"
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Tozalash
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Test Payloads */}
          <Card className="sqli-card">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-primary" />
              Tez test payloadlar
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Quyidagi tayyor SQL injection payloadlardan birini tanlang — bir click bilan natijani ko&apos;ring.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUICK_PAYLOADS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleQuickTest(item.value)}
                  disabled={loading}
                  className="group flex items-start gap-3 rounded-xl border border-border/70 bg-background/35 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                >
                  <span className={`mt-0.5 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.category === 'Safe' ? 'bg-green-500/15 text-green-500' : 'bg-destructive/15 text-destructive'}`}>
                    {item.category}
                  </span>
                  <span className="flex-1 font-mono text-xs text-muted-foreground transition group-hover:text-foreground">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right — Result Panel */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Detection Status */}
              <Card className={`sqli-card border ${result.detected ? 'border-destructive/30' : 'border-green-500/30'}`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${result.detected ? 'bg-destructive/15' : 'bg-green-500/15'}`}>
                    {result.detected ? (
                      <ShieldAlert className="h-7 w-7 text-destructive" />
                    ) : (
                      <ShieldCheck className="h-7 w-7 text-green-500" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${result.detected ? 'text-destructive' : 'text-green-500'}`}>
                      {result.detected ? '⚠️ SQL Injection aniqlandi!' : '✅ Xavfsiz matn'}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {result.inputLength} ta belgi tekshirildi
                    </p>
                  </div>
                </div>
              </Card>

              {/* Risk Score Gauge */}
              <Card className={`sqli-card ${severityConfig ? `shadow-lg ${severityConfig.glow}` : ''}`}>
                <h3 className="mb-2 text-center text-sm font-semibold text-muted-foreground uppercase tracking-[0.18em]">
                  Xavf darajasi
                </h3>
                <RiskGauge score={result.riskScore} />
                <div className="mt-4 flex items-center justify-center gap-3">
                  {severityConfig && (
                    <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${severityConfig.color} ${severityConfig.bg} ${severityConfig.border}`}>
                      <severityConfig.icon className="h-4 w-4" />
                      {result.severity}
                    </span>
                  )}
                </div>
              </Card>

              {/* Analysis */}
              <Card className="sqli-card">
                <h3 className="mb-3 text-sm font-semibold">Tahlil natijasi</h3>
                <p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
                  {result.analysis}
                </p>
              </Card>

              {/* Matched Rules */}
              {result.matchedRules.length > 0 && (
                <Card className="sqli-card">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Topilgan patternlar ({result.matchedRules.length})
                  </h3>
                  <div className="space-y-3">
                    {result.matchedRules.map((rule, index) => (
                      <MatchedRuleCard key={rule.rule} rule={rule} index={index} />
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="sqli-card">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <SearchCode className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="font-semibold text-foreground">Natija kutilmoqda</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  Matn kiritib &quot;Tekshirish&quot; tugmasini bosing yoki tez test payloadlardan birini tanlang.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <Card className="sqli-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Clock className="h-5 w-5 text-primary" />
              Tekshiruv tarixi
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistory([])}
              className="border-border/80 bg-card/60 text-xs"
            >
              Tozalash
            </Button>
          </div>
          <div className="space-y-3">
            {history.map((entry) => {
              const config = getSeverityConfig(entry.result.severity)
              return (
                <div
                  key={entry.id}
                  className="group flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/35 p-4 transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${config.color} ${config.bg} ${config.border}`}>
                        {entry.result.detected ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                        {entry.result.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Score: {entry.result.riskScore} • {entry.result.matchedRules.length} pattern
                      </span>
                    </div>
                    <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">
                      {entry.input}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {entry.timestamp.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleCopy(entry.input)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                      title="Nusxalash"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setInput(entry.input); handleDetect(entry.input) }}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                      title="Qayta tekshirish"
                    >
                      <SearchCode className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
