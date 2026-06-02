'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { ActivitySquare, BarChart3, ShieldAlert, Target, TrendingUp, Zap } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface AnalyticsResponse {
  analytics: {
    totalScans: number
    totalVulnerabilities: number
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    averageResponseTime: number
    successRate: number
  }
  timeline: { name: string; scans: number; vulnerabilities: number }[]
  severityDistribution: { name: string; value: number }[]
  payloadEffectiveness: { name: string; success: number }[]
  detectionTrend: { time: string; detected: number; missed: number }[]
}

const severityColors: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
}

const payloadColors: Record<string, string> = {
  'Error-based': '#ef4444',
  'Union-based': '#00d9ff',
  'Boolean-based': '#06f59c',
  'Time-based': '#8b5cf6',
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<AnalyticsResponse>('/analytics')
      .then(setData)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Analytics yuklanmadi.'))
  }, [])

  const severitySummary = useMemo(() => {
    if (!data) return []
    return data.severityDistribution.filter((item) => item.value > 0)
  }, [data])

  const payloadRanking = useMemo(() => {
    if (!data) return []
    return [...data.payloadEffectiveness].sort((left, right) => right.success - left.success)
  }, [data])

  const insightText = useMemo(() => {
    if (!data) return ''

    const severityLeader = severitySummary[0]
    const bestPayload = payloadRanking[0]

    if (!severityLeader && !bestPayload) {
      return 'Hozircha yetarli analitik signal to‘planmagan. Yangi skanlardan keyin trend va prioritetlar shu yerda boyiydi.'
    }

    const severityPart = severityLeader
      ? `${severityLeader.name} toifasi ${severityLeader.value} ta finding bilan asosiy risk qatlamini shakllantiryapti.`
      : 'Severity signal hozircha past.'

    const payloadPart = bestPayload
      ? `${bestPayload.name} payload turi ${bestPayload.success}% natija bilan eng samarali ko‘rinmoqda.`
      : 'Payload samaradorligi hali to‘liq shakllanmagan.'

    return `${severityPart} ${payloadPart}`
  }, [data, payloadRanking, severitySummary])

  if (error) return <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</div>
  if (!data) return <div className="text-sm text-muted-foreground">Analytics yuklanmoqda...</div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-bold">
            <BarChart3 className="h-8 w-8 text-primary" />
            Tahlil markazi
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">Skanlar, severity qatlamlari va payload samaradorligi bo'yicha ko'rsatkichlar optimallashtirilgan ko'rinishda beriladi.</p>
        </div>
        <Card className="sqli-card max-w-xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Asosiy insight</p>
          <p className="mt-2 text-sm text-muted-foreground">{insightText}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Umumiy skanlar', value: data.analytics.totalScans, hint: 'Bajarilgan tahlillar', icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Topilgan zaifliklar', value: data.analytics.totalVulnerabilities, hint: 'Jami findinglar', icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'O‘rtacha javob', value: `${data.analytics.averageResponseTime} ms`, hint: 'Request tezligi', icon: Zap, color: 'text-secondary', bg: 'bg-secondary/10' },
          { label: 'Muvaffaqiyat darajasi', value: `${data.analytics.successRate}%`, hint: 'Heuristik qamrov', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="sqli-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className={`mt-3 text-3xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.hint}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg}`}>
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="sqli-card">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold"><ActivitySquare className="h-5 w-5 text-primary" />Skan va finding oqimi</h3>
              <p className="mt-1 text-sm text-muted-foreground">Area chart umumiy skan soni bilan topilgan findinglar nisbatini aniqroq ko'rsatadi.</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeline} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="scansFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00d9ff" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="vulnsFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27324a" />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#131a2b', border: '1px solid #27324a', borderRadius: '16px' }} />
                <Legend />
                <Area type="monotone" dataKey="scans" name="Skanlar" stroke="#00d9ff" fill="url(#scansFill)" strokeWidth={3} />
                <Area type="monotone" dataKey="vulnerabilities" name="Findinglar" stroke="#ef4444" fill="url(#vulnsFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="sqli-card">
          <h3 className="text-lg font-bold">Severity balansi</h3>
          <p className="mt-1 text-sm text-muted-foreground">Ring chart xavf qatlamining umumiy tarkibini ko'rsatadi.</p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.severityDistribution} innerRadius={65} outerRadius={96} paddingAngle={4} dataKey="value" nameKey="name">
                  {data.severityDistribution.map((entry) => (
                    <Cell key={entry.name} fill={severityColors[entry.name] ?? '#00d9ff'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#131a2b', border: '1px solid #27324a', borderRadius: '16px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.severityDistribution.map((item) => (
              <div key={item.name} className="rounded-2xl border border-border/70 bg-background/35 p-3">
                <p className="text-xs text-muted-foreground">{item.name}</p>
                <p className="mt-1 text-lg font-semibold" style={{ color: severityColors[item.name] ?? '#e8ecf1' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="sqli-card">
          <h3 className="text-lg font-bold">Payload samaradorligi</h3>
          <p className="mt-1 text-sm text-muted-foreground">Gorizontal bar chart qaysi payload turi ko'proq signal berayotganini solishtirish uchun qulayroq.</p>
          <div className="mt-4 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payloadRanking} layout="vertical" margin={{ top: 10, right: 14, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27324a" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} domain={[0, 100]} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} width={96} />
                <Tooltip contentStyle={{ backgroundColor: '#131a2b', border: '1px solid #27324a', borderRadius: '16px' }} formatter={(value: number) => [`${value}%`, 'Samaradorlik']} />
                <Bar dataKey="success" radius={[0, 10, 10, 0]}>
                  {payloadRanking.map((entry) => (
                    <Cell key={entry.name} fill={payloadColors[entry.name] ?? '#00d9ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="sqli-card">
          <h3 className="text-lg font-bold">Detection aniqligi</h3>
          <p className="mt-1 text-sm text-muted-foreground">Chiziqli trend aniqlangan va o'tib ketgan signallar o'rtasidagi tafovutni vaqt bo'yicha beradi.</p>
          <div className="mt-4 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.detectionTrend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27324a" />
                <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#131a2b', border: '1px solid #27324a', borderRadius: '16px' }} />
                <Legend />
                <Line type="monotone" dataKey="detected" name="Aniqlangan" stroke="#06f59c" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="missed" name="O'tib ketgan" stroke="#f97316" strokeWidth={3} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
