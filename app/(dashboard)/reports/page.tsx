'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, Download, Search } from 'lucide-react'
import { apiFetch, downloadFromApi } from '@/lib/api'
import type { VulnerabilityDto } from '@/lib/api-types'
import type { VulnerabilitySeverity } from '@/lib/types'

const severityColors: Record<VulnerabilitySeverity, { bg: string; text: string; badge: string }> = {
  Critical: { bg: 'bg-destructive/10', text: 'text-destructive', badge: 'sqli-badge-critical' },
  High: { bg: 'bg-orange-500/10', text: 'text-orange-400', badge: 'sqli-badge-high' },
  Medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', badge: 'sqli-badge-medium' },
  Low: { bg: 'bg-green-500/10', text: 'text-green-400', badge: 'sqli-badge-low' },
}

interface ReportsResponse {
  vulnerabilities: VulnerabilityDto[]
  stats: { total: number; critical: number; high: number; medium: number; low: number }
}

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState<VulnerabilitySeverity | 'All'>('All')
  const [selectedVulnerability, setSelectedVulnerability] = useState<string | null>(null)
  const [data, setData] = useState<ReportsResponse | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (selectedSeverity) params.set('severity', selectedSeverity)
    apiFetch<ReportsResponse>(`/reports?${params.toString()}`).then(setData).catch(() => undefined)
  }, [searchTerm, selectedSeverity])

  const selectedVulnData = useMemo(() => data?.vulnerabilities.find((item) => item.id === selectedVulnerability) ?? null, [data, selectedVulnerability])

  if (!data) return <div className="text-sm text-muted-foreground">Hisobotlar yuklanmoqda...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-bold"><FileText className="h-8 w-8 text-primary" />Zaiflik Hisobotlari</h1>
          <p className="mt-2 text-muted-foreground">Backenddan kelayotgan findinglar va eksport imkoniyatlari.</p>
        </div>
        <Button onClick={() => downloadFromApi('/reports/export?format=pdf', 'reports.pdf')} className="sqli-button-primary"><Download className="mr-2 h-4 w-4" />PDF yuklab olish</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card className="sqli-card text-center"><p className="text-sm text-muted-foreground">Umumiy</p><p className="mt-2 text-2xl font-bold text-primary">{data.stats.total}</p></Card>
        {(['critical', 'high', 'medium', 'low'] as const).map((key) => {
          const severityKey = `${key.charAt(0).toUpperCase()}${key.slice(1)}` as VulnerabilitySeverity
          return <Card key={key} className={`sqli-card text-center ${severityColors[severityKey].bg}`}><p className="text-sm capitalize text-muted-foreground">{key}</p><p className={`mt-2 text-2xl font-bold ${severityColors[severityKey].text}`}>{data.stats[key]}</p></Card>
        })}
      </div>

      <Card className="sqli-card">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="URL, parametr yoki payload turi" className="sqli-input w-full pl-10" /></div></div>
          <select value={selectedSeverity} onChange={(event) => setSelectedSeverity(event.target.value as VulnerabilitySeverity | 'All')} className="sqli-input"><option value="All">Barcha severity</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>
          <Button onClick={() => downloadFromApi('/reports/export?format=json', 'reports.json')} variant="outline" className="border-border hover:bg-card"><Download className="h-4 w-4" /></Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {data.vulnerabilities.map((vuln) => (
            <Card key={vuln.id} onClick={() => setSelectedVulnerability(vuln.id)} className={`sqli-card cursor-pointer transition ${selectedVulnerability === vuln.id ? 'border-primary bg-primary/10' : 'hover:border-primary/50'}`}>
              <div className="space-y-3"><div className="flex items-start justify-between gap-4"><div className="flex-1"><h4 className="font-bold text-primary">{vuln.url}</h4><p className="mt-1 text-sm text-muted-foreground">Parametr: {vuln.parameter}</p></div><div className={severityColors[vuln.severity].badge}>{vuln.severity}</div></div><div className="rounded bg-black/30 p-2 font-mono text-xs text-primary/80 break-words">{vuln.payload}</div><div className="flex items-center gap-4 text-xs text-muted-foreground"><span>{vuln.payloadType}</span><span>Risk Score: {vuln.riskScore}</span><span>{vuln.responseTime}ms</span></div></div>
            </Card>
          ))}
        </div>

        <Card className="sqli-card">
          {selectedVulnData ? (
            <div className="space-y-4 text-sm"><h3 className="text-lg font-bold">Zaiflik tafsili</h3><div><p className="mb-1 text-muted-foreground">Severity</p><p className={`font-bold ${severityColors[selectedVulnData.severity].text}`}>{selectedVulnData.severity}</p></div><div><p className="mb-1 text-muted-foreground">Payload turi</p><p className="font-bold">{selectedVulnData.payloadType}</p></div><div><p className="mb-1 text-muted-foreground">Xato shabloni</p><div className="max-h-24 overflow-y-auto rounded bg-black/30 p-2 font-mono text-xs text-primary/80">{selectedVulnData.errorPattern}</div></div><div><p className="mb-1 text-muted-foreground">Isbot</p><div className="max-h-24 overflow-y-auto rounded bg-black/30 p-2 font-mono text-xs text-primary/80">{selectedVulnData.evidence}</div></div><div className="grid grid-cols-2 gap-2 border-t border-border pt-3"><Button onClick={() => downloadFromApi('/reports/export?format=pdf', 'report.pdf')} className="sqli-button-primary text-xs">PDF</Button><Button onClick={() => downloadFromApi('/reports/export?format=csv', 'report.csv')} variant="outline" className="text-xs">CSV</Button></div></div>
          ) : <div className="flex h-full items-center justify-center text-center text-muted-foreground">Zaiflikni tanlab ko'ring.</div>}
        </Card>
      </div>
    </div>
  )
}
