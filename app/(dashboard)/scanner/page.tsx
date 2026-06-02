'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Crosshair, Plus, Trash2, Play, Pause, Sparkles, ShieldAlert, Gauge, Radar, Layers3 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { ScanCreateResponseDto, ScanDetailDto, ScanDto, ScanOverviewDto } from '@/lib/api-types'

type RequestMethod = 'GET' | 'POST'
type PayloadStrategy = 'conservative' | 'balanced' | 'aggressive'

interface Parameter {
  key: string
  value: string
  method: RequestMethod
}

export default function ScannerPage() {
  const [url, setUrl] = useState('')
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [depth, setDepth] = useState(3)
  const [payloadStrategy, setPayloadStrategy] = useState<PayloadStrategy>('balanced')
  const [followRedirects, setFollowRedirects] = useState(true)
  const [useRandomUserAgent, setUseRandomUserAgent] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [message, setMessage] = useState('')
  const [recentScans, setRecentScans] = useState<ScanDto[]>([])
  const [selectedScan, setSelectedScan] = useState<ScanDto | null>(null)
  const [scanOverview, setScanOverview] = useState<ScanOverviewDto | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)

  const loadScans = async (loadLatest = false) => {
    const scans = await apiFetch<ScanDto[]>('/scans')
    setRecentScans(scans)
    if (loadLatest && scans.length > 0) {
      await loadScanDetail(scans[0].id)
    }
  }

  const loadScanDetail = async (scanId: string) => {
    setOverviewLoading(true)
    try {
      const detail = await apiFetch<ScanDetailDto>(`/scans/${scanId}`)
      setSelectedScan(detail.scan)
      setScanOverview(detail.overview)
    } catch {
      setSelectedScan(null)
      setScanOverview(null)
    } finally {
      setOverviewLoading(false)
    }
  }

  useEffect(() => {
    loadScans(true).catch(() => undefined)
  }, [])

  const addParameter = () => setParameters((current) => [...current, { key: '', value: '', method: 'GET' }])
  const removeParameter = (index: number) => setParameters((current) => current.filter((_, itemIndex) => itemIndex !== index))
  const updateParameter = <K extends keyof Parameter>(index: number, field: K, value: Parameter[K]) => {
    setParameters((current) => current.map((parameter, itemIndex) => (itemIndex === index ? { ...parameter, [field]: value } : parameter)))
  }

  const handleStartScan = async () => {
    if (!url.trim()) {
      setMessage('Iltimos, maqsad URL kiriting.')
      return
    }
    setIsScanning(true)
    setMessage('')
    try {
      const response = await apiFetch<ScanCreateResponseDto>('/scans', {
        method: 'POST',
        body: JSON.stringify({
          target_url: url,
          parameters,
          depth,
          payload_strategy: payloadStrategy,
          follow_redirects: followRedirects,
          use_random_user_agent: useRandomUserAgent,
        }),
      })
      setSelectedScan(response.scan)
      setScanOverview(response.overview)
      setMessage(
        `${response.scan.targetUrl} uchun skan yakunlandi. ${response.vulnerabilities} ta signal topildi, umumiy xavf darajasi ${response.overview.riskLevel.toLowerCase()} deb baholandi.`
      )
      await loadScans()
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : 'Skan yaratilmadi.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-bold"><Crosshair className="h-8 w-8 text-primary" />Maqsad Skaneri</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Target URL va parametrlar asosida non-invasive heuristik backend tahlili ishlaydi.</p>
        </div>
        <Card className="sqli-card gap-2 p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI yo'nalish</p><Link href="/ai-assistant" className="text-lg font-semibold text-primary hover:underline">AI tavsiyani ko'rish</Link></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="sqli-card">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold">Maqsad URL</label>
              <Input value={url} onChange={(event) => setUrl(event.target.value)} className="sqli-input h-11 w-full" placeholder="https://example.com/login" />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="block text-sm font-semibold">Parametrlar</label>
                <Button onClick={addParameter} variant="outline" size="sm" className="border-border/80 bg-card/60"><Plus className="mr-2 h-4 w-4" />Qo'shish</Button>
              </div>
              <div className="space-y-3">
                {parameters.map((parameter, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-border/70 bg-background/35 p-4 md:grid-cols-[1fr_1fr_110px_44px]">
                    <Input value={parameter.key} onChange={(event) => updateParameter(index, 'key', event.target.value)} className="sqli-input h-11 w-full" placeholder="Parametr" />
                    <Input value={parameter.value} onChange={(event) => updateParameter(index, 'value', event.target.value)} className="sqli-input h-11 w-full" placeholder="Qiymat" />
                    <select value={parameter.method} onChange={(event) => updateParameter(index, 'method', event.target.value as RequestMethod)} className="sqli-input h-11 w-full">
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                    <button onClick={() => removeParameter(index)} className="flex h-11 w-11 items-center justify-center rounded-xl text-destructive transition hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {parameters.length === 0 && <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">Parametr qo'shilmasa, backend demo parametrlar bilan heuristik tahlil qiladi.</div>}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold"><Gauge className="h-4 w-4 text-primary" />Skan chuqurligi</label>
                <input type="range" min="1" max="5" value={depth} onChange={(event) => setDepth(Number(event.target.value))} className="w-full" />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Yengil</span><span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{depth}</span><span>Chuqur</span></div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                <label className="mb-3 block text-sm font-semibold">Payload strategiyasi</label>
                <div className="space-y-2">
                  {[
                    { value: 'conservative', label: 'Konservativ' },
                    { value: 'balanced', label: 'Muvozanatli' },
                    { value: 'aggressive', label: 'Tajovuzkor' },
                  ].map((option) => (
                    <button key={option.value} type="button" onClick={() => setPayloadStrategy(option.value as PayloadStrategy)} className={`w-full rounded-xl border p-3 text-left transition ${payloadStrategy === option.value ? 'border-primary bg-primary/10' : 'border-border/70 bg-card/40 hover:border-primary/40'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-4"><input type="checkbox" checked={followRedirects} onChange={(event) => setFollowRedirects(event.target.checked)} className="h-4 w-4 rounded border-border bg-background" /><span className="text-sm">Redirectlarni kuzatish</span></label>
              <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-4"><input type="checkbox" checked={useRandomUserAgent} onChange={(event) => setUseRandomUserAgent(event.target.checked)} className="h-4 w-4 rounded border-border bg-background" /><span className="text-sm">Tasodifiy User-Agent</span></label>
            </div>

            {message && <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">{message}</div>}

            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row">
              <Button onClick={handleStartScan} disabled={isScanning} className="sqli-button-primary h-11 flex-1">{isScanning ? <><Pause className="mr-2 h-4 w-4" />Skanlanmoqda...</> : <><Play className="mr-2 h-4 w-4" />Skanerlashni boshlash</>}</Button>
              <Button asChild variant="outline" className="h-11 border-border/80 bg-card/60 sm:min-w-52"><Link href="/ai-assistant"><Sparkles className="mr-2 h-4 w-4" />AI tavsiyani ko'rish</Link></Button>
            </div>
          </div>
        </Card>

        <Card className="sqli-card">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10"><ShieldAlert className="h-5 w-5 text-destructive" /></div><div><h3 className="font-semibold">Eslatma</h3><p className="text-sm text-muted-foreground">Bu backend tashqi targetga hujum qilmaydi, faqat xavfsiz heuristik tahlil qiladi.</p></div></div>

          <div className="mt-6 border-t border-border/70 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Radar className="h-4 w-4 text-primary" />Matnli skan natijasi</div>
            {overviewLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Natija yuklanmoqda...</p>
            ) : scanOverview && selectedScan ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Natija sharhi</p>
                  <h4 className="mt-2 font-semibold text-primary">{selectedScan.targetUrl}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{scanOverview.narrative}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Xavf darajasi</p>
                    <p className="mt-2 text-xl font-semibold text-destructive">{scanOverview.riskLevel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">O'rtacha risk ball: {scanOverview.riskScore}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ishonch va signal</p>
                    <p className="mt-2 text-xl font-semibold text-secondary">{scanOverview.confidence}%</p>
                    <p className="mt-1 text-sm text-muted-foreground">{scanOverview.detectedSignals} ta signal, {scanOverview.averageResponseTime} ms</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Layers3 className="h-4 w-4 text-primary" />Kategoriyalar va severity</div>
                  <div className="flex flex-wrap gap-2">
                    {scanOverview.categories.length > 0 ? scanOverview.categories.map((category) => (
                      <span key={category.name} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">{category.name}: {category.count}</span>
                    )) : <span className="text-sm text-muted-foreground">Aniq category signal qaytmadi.</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scanOverview.severityBreakdown.map((item) => (
                      <span key={item.name} className="rounded-full border border-border/70 bg-card/50 px-3 py-1 text-xs text-muted-foreground">{item.name}: {item.count}</span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                  <p className="text-sm font-semibold">Ustuvor findinglar</p>
                  <div className="mt-3 space-y-3">
                    {scanOverview.topFindings.length > 0 ? scanOverview.topFindings.map((finding) => (
                      <div key={finding.id} className="rounded-xl border border-border/70 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-primary">{finding.parameter}</span>
                          <span className="text-destructive">{finding.severity} / {finding.riskScore}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Turi: {finding.payloadType}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{finding.evidence}</p>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">Top finding mavjud emas.</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/35 p-4">
                  <p className="text-sm font-semibold">Muhim jihatlar</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {scanOverview.importantNotes.map((note) => <p key={note}>{note}</p>)}
                    {scanOverview.parameterSummary.length > 0 && <p>Ko'rib chiqilgan parametrlar: {scanOverview.parameterSummary.join(', ')}.</p>}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Skanerlashni boshlagach natija shu bo'limda kategoriya, xavf darajasi, turi va muhim izohlar bilan matnli ko'rinishda chiqadi.</p>
            )}
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold">So'nggi skanlar</h2>
        <div className="space-y-3">
          {recentScans.map((scan) => (
            <Card key={scan.id} className="sqli-card cursor-pointer transition hover:border-primary/40" onClick={() => loadScanDetail(scan.id)}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1"><h4 className="font-semibold text-primary">{scan.targetUrl}</h4><div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>Status: {scan.status}</span><span>{scan.vulnerabilitiesFound} ta finding</span><span>{scan.requestsTotal} ta request</span></div></div>
                <div className="text-left lg:text-right"><p className="text-2xl font-semibold text-secondary">{scan.successRate}%</p><p className="text-xs text-muted-foreground">{scan.duration} min</p></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
