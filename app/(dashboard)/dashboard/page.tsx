'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
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
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/stat-card'
import { Activity, AlertTriangle, CheckCircle2, Clock, Globe2, Shield, ShieldCheck } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { ActivityDto, AnalyticsSnapshot, ScanDto, SystemStatusDto } from '@/lib/api-types'

interface DashboardResponse {
  analytics: AnalyticsSnapshot
  systemStatus: SystemStatusDto
  recentActivity: ActivityDto[]
  recentScans: ScanDto[]
}

function getScanLabel(url: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    return `${parsed.hostname}${path}`
  } catch {
    return url.replace(/^https?:\/\//, '')
  }
}

function getShortScanLabel(url: string) {
  const label = getScanLabel(url)
  return label.length > 20 ? `${label.slice(0, 20)}...` : label
}

function getRiskBadgeClass(vulnerabilitiesFound: number) {
  if (vulnerabilitiesFound >= 3) return 'sqli-badge-critical'
  if (vulnerabilitiesFound === 2) return 'sqli-badge-high'
  if (vulnerabilitiesFound === 1) return 'sqli-badge-medium'
  return 'sqli-badge-low'
}

function getRiskLabel(vulnerabilitiesFound: number) {
  if (vulnerabilitiesFound >= 3) return 'Critical'
  if (vulnerabilitiesFound === 2) return 'High'
  if (vulnerabilitiesFound === 1) return 'Medium'
  return 'Low'
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<DashboardResponse>('/dashboard/summary')
      .then(setData)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Dashboard yuklanmadi.'))
  }, [])

  const chartData = useMemo(() => {
    return (data?.recentScans ?? []).map((scan) => ({
      name: getShortScanLabel(scan.targetUrl),
      fullName: getScanLabel(scan.targetUrl),
      time: new Date(scan.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      requests: scan.requestsTotal,
      vulnerabilities: scan.vulnerabilitiesFound,
      successRate: scan.successRate,
    }))
  }, [data])

  const severityData = data
    ? [
        { name: 'Critical', value: data.analytics.criticalCount, fill: '#ef4444' },
        { name: 'High', value: data.analytics.highCount, fill: '#f97316' },
        { name: 'Medium', value: data.analytics.mediumCount, fill: '#eab308' },
        { name: 'Low', value: data.analytics.lowCount, fill: '#22c55e' },
      ]
    : []

  const highestRiskScan = useMemo(() => {
    if (!data?.recentScans.length) return null
    return [...data.recentScans].sort((left, right) => right.vulnerabilitiesFound - left.vulnerabilitiesFound || right.successRate - left.successRate)[0]
  }, [data])

  if (error) {
    return <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</div>
  }

  if (!data) {
    return <div className="text-sm text-muted-foreground">Dashboard yuklanmoqda...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">SQL Injection aniqlash tizimining umumiy holati va eng so'nggi endpoint natijalari.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Card className="sqli-card min-w-[280px] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Ustuvor endpoint</p>
            <p className="mt-2 font-semibold text-primary">{highestRiskScan ? getScanLabel(highestRiskScan.targetUrl) : 'Mavjud emas'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{highestRiskScan ? `${highestRiskScan.vulnerabilitiesFound} ta finding va ${highestRiskScan.requestsTotal} ta request` : 'Yangi skan kutilmoqda'}</p>
          </Card>
          <Button asChild className="sqli-button-primary h-12">
            <Link href="/scanner">Yangi skanirish</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Umumiy skanlar" value={data.analytics.totalScans} trend="up" trendValue="Backend ma'lumotlari" icon={Shield} />
        <StatCard title="Aniqlangan zaifliklar" value={data.analytics.totalVulnerabilities} trend="up" trendValue="Aktual findinglar" icon={AlertTriangle} className="border-destructive/30 bg-card/50" />
        <StatCard title="Muvaffaqiyat darajasi" value={`${data.analytics.successRate}%`} trend="up" trendValue="Yakunlangan ishlar" icon={CheckCircle2} />
        <StatCard title="O'rtacha vaqt" value={`${data.analytics.averageResponseTime}ms`} trend="down" trendValue="Heuristik hisob" icon={Clock} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="sqli-card">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Endpointlar bo'yicha so'nggi skanlar</h3>
              <p className="mt-1 text-sm text-muted-foreground">Scan 1, Scan 2 o'rniga real endpoint label va vaqt kesimidan foydalanildi.</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="requestsFillDash" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00d9ff" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27324a" />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#131a2b', border: '1px solid #27324a', borderRadius: '16px' }}
                  formatter={(value: number, name: string) => [value, name === 'requests' ? 'Request' : 'Finding']}
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload
                    return item ? `${item.fullName} • ${item.time}` : ''
                  }}
                />
                <Area type="monotone" dataKey="requests" stroke="#00d9ff" fill="url(#requestsFillDash)" strokeWidth={3} name="requests" />
                <Line type="monotone" dataKey="vulnerabilities" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} name="vulnerabilities" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="sqli-card">
          <h3 className="text-lg font-bold">Zaiflik tasnifi</h3>
          <p className="mt-1 text-sm text-muted-foreground">Severity bo'yicha hozirgi muvozanat.</p>
          <div className="mt-4 flex h-64 w-full items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={56} outerRadius={82} dataKey="value">
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#131a2b', border: '1px solid #27324a', borderRadius: '16px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {severityData.map((item) => (
              <div key={item.name} className="rounded-2xl border border-border/70 bg-background/35 p-3">
                <p className="text-xs text-muted-foreground">{item.name}</p>
                <p className="mt-1 text-lg font-semibold" style={{ color: item.fill }}>{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="sqli-card">
          <h3 className="mb-4 text-lg font-bold">Endpoint muvaffaqiyat trendi</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27324a" />
                <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#131a2b', border: '1px solid #27324a', borderRadius: '16px' }} formatter={(value: number) => [`${value}%`, 'Success rate']} />
                <Line type="monotone" dataKey="successRate" stroke="#06f59c" strokeWidth={3} dot={{ fill: '#06f59c', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="sqli-card">
          <h3 className="mb-4 text-lg font-bold">Tizim holati</h3>
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CPU</span>
                <span className="text-sm font-bold">{data.systemStatus.cpuUsage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-card">
                <div style={{ width: `${data.systemStatus.cpuUsage}%` }} className="h-full bg-primary sqli-glow"></div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Xotira</span>
                <span className="text-sm font-bold">{data.systemStatus.memoryUsage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-card">
                <div style={{ width: `${data.systemStatus.memoryUsage}%` }} className="h-full bg-secondary sqli-glow-green"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Faol sessiyalar</p>
                <p className="mt-2 text-2xl font-semibold text-primary">{data.systemStatus.activeSessions}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Holat</p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-sm text-secondary">
                  <ShieldCheck className="h-4 w-4" />
                  Barqaror
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="sqli-card">
        <div className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Globe2 className="h-5 w-5 text-primary" />
          So'nggi endpointlar
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {data.recentScans.map((scan) => (
            <div key={scan.id} className="rounded-2xl border border-border/70 bg-background/35 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-primary">{getScanLabel(scan.targetUrl)}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Status: {scan.status}</span>
                    <span>{scan.requestsTotal} request</span>
                    <span>{new Date(scan.timestamp).toLocaleString('uz-UZ')}</span>
                  </div>
                </div>
                <span className={getRiskBadgeClass(scan.vulnerabilitiesFound)}>{getRiskLabel(scan.vulnerabilitiesFound)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="sqli-card">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Activity className="h-5 w-5" />
          So'nggi faollik
        </h3>
        <div className="space-y-3">
          {data.recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 border-b border-border pb-3 last:border-0">
              <div className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${activity.status === 'success' ? 'bg-secondary' : activity.status === 'critical' ? 'bg-destructive' : 'bg-primary'}`}></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{activity.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString('uz-UZ')}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
