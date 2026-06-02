'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Monitor, Download, Play, Pause, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { apiFetch, downloadFromApi } from '@/lib/api'
import type { RequestDto } from '@/lib/api-types'

interface MonitorResponse {
  requests: RequestDto[]
  stats: {
    totalRequests: number
    detected: number
    averageResponseTime: number
    errorRate: number
  }
  progress: {
    collected?: number
    analyzed?: number
    flagged?: number
  }
}

export default function MonitorPage() {
  const [isPaused, setIsPaused] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [data, setData] = useState<MonitorResponse | null>(null)

  useEffect(() => {
    const load = () => apiFetch<MonitorResponse>('/monitor').then(setData).catch(() => undefined)
    load()
    const interval = window.setInterval(() => {
      if (!isPaused) load()
    }, 7000)
    return () => window.clearInterval(interval)
  }, [isPaused])

  const selectedRequestData = data?.requests.find((request) => request.id === selectedRequest) ?? null

  if (!data) return <div className="text-sm text-muted-foreground">Monitoring yuklanmoqda...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-bold"><Monitor className="h-8 w-8 text-primary" />Real-time Monitoring</h1>
          <p className="mt-2 text-muted-foreground">Backend request loglari va heuristik signal natijalari.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsPaused((value) => !value)} variant="outline" className="border-border hover:bg-card">{isPaused ? <><Play className="mr-2 h-4 w-4" />Davom ettirish</> : <><Pause className="mr-2 h-4 w-4" />Pauza</>}</Button>
          <Button onClick={() => downloadFromApi('/reports/export?format=json', 'monitor.json')} variant="outline" className="border-border hover:bg-card"><Download className="mr-2 h-4 w-4" />Loglarni yuklab olish</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="sqli-card"><p className="text-sm text-muted-foreground">Umumiy so'rovlar</p><p className="text-3xl font-bold text-primary">{data.stats.totalRequests}</p></Card>
        <Card className="sqli-card"><p className="text-sm text-muted-foreground">Aniqlangan signal</p><p className="text-3xl font-bold text-destructive">{data.stats.detected}</p></Card>
        <Card className="sqli-card"><p className="text-sm text-muted-foreground">O'rtacha vaqt</p><p className="text-3xl font-bold text-secondary">{Math.round(data.stats.averageResponseTime)}ms</p></Card>
        <Card className="sqli-card"><p className="text-sm text-muted-foreground">Error rate</p><p className="text-3xl font-bold text-primary">{data.stats.errorRate}%</p></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="sqli-card lg:col-span-2">
          <h3 className="mb-4 text-lg font-bold">So'rov logi</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.requests.map((request) => (
              <div key={request.id} onClick={() => setSelectedRequest(request.id)} className={`cursor-pointer rounded-lg border p-3 transition ${selectedRequest === request.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-card/50'}`}>
                <div className="flex items-start gap-3"><div className="mt-1 flex-shrink-0">{request.detected ? <AlertCircle className="h-5 w-5 text-destructive" /> : <CheckCircle2 className="h-5 w-5 text-secondary" />}</div><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className="inline-flex rounded bg-primary/20 px-2 py-1 text-xs font-bold text-primary">{request.method}</span><span className="truncate text-xs text-muted-foreground">{request.url}</span></div><div className="flex gap-3 text-xs text-muted-foreground"><span>Kod: {request.statusCode}</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{request.responseTime}ms</span></div></div></div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="sqli-card">
          {selectedRequestData ? (
            <div className="space-y-4 text-sm"><h3 className="text-lg font-bold">So'rov tafsili</h3><div><p className="mb-1 text-muted-foreground">URL</p><p className="rounded bg-black/30 p-2 font-mono text-xs text-primary/80">{selectedRequestData.url}</p></div><div><p className="mb-1 text-muted-foreground">Payload</p><p className="rounded bg-black/30 p-2 font-mono text-xs text-primary/80">{selectedRequestData.payload}</p></div><div><p className="mb-1 text-muted-foreground">Javob</p><div className="max-h-32 overflow-y-auto rounded bg-black/30 p-2 font-mono text-xs text-primary/80">{selectedRequestData.response}</div></div></div>
          ) : <div className="flex h-full items-center justify-center text-center text-muted-foreground">So'rovni tanlang.</div>}
        </Card>
      </div>

      <Card className="sqli-card">
        <h3 className="mb-4 text-lg font-bold">Skan taraqqiyoti</h3>
        <div className="space-y-3">
          {[
            { label: 'Yigish', value: data.progress.collected ?? 0, color: 'bg-primary' },
            { label: 'Tahlil', value: data.progress.analyzed ?? 0, color: 'bg-secondary' },
            { label: 'Signal', value: data.progress.flagged ?? 0, color: 'bg-destructive' },
          ].map((item) => (
            <div key={item.label}><div className="mb-2 flex justify-between text-sm"><span>{item.label}</span><span className="font-bold">{item.value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-card"><div style={{ width: `${item.value}%` }} className={`h-full ${item.color}`}></div></div></div>
          ))}
        </div>
      </Card>
    </div>
  )
}

