'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Save, Copy, Eye, EyeOff, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { ApiKeyPreviewDto, SettingsDto } from '@/lib/api-types'

interface SettingsResponse {
  settings: SettingsDto
  apiKeys: ApiKeyPreviewDto[]
}

export default function SettingsPage() {
  const [scanSettings, setScanSettings] = useState<SettingsDto | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKeyPreviewDto[]>([])
  const [showApiKey, setShowApiKey] = useState(false)
  const [freshApiKey, setFreshApiKey] = useState('')
  const [message, setMessage] = useState('')

  const loadSettings = () => {
    apiFetch<SettingsResponse>('/settings').then((response) => {
      setScanSettings(response.settings)
      setApiKeys(response.apiKeys)
    }).catch(() => setMessage('Sozlamalarni yuklab bo\'lmadi.'))
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSettingChange = <K extends keyof SettingsDto>(key: K, value: SettingsDto[K]) => {
    setScanSettings((current) => (current ? { ...current, [key]: value } : current))
  }

  const saveSettings = async () => {
    if (!scanSettings) return
    await apiFetch('/settings', { method: 'PUT', body: JSON.stringify({
      timeout: scanSettings.timeout,
      request_rate: scanSettings.requestRate,
      payload_strategy: scanSettings.payloadStrategy,
      risk_scoring_model: scanSettings.riskScoringModel,
      follow_redirects: scanSettings.followRedirects,
      use_random_user_agent: scanSettings.useRandomUserAgent,
      verify_ssl: scanSettings.verifySsl,
      notify_critical: scanSettings.notifyCritical,
      notify_scan_complete: scanSettings.notifyScanComplete,
      notify_weekly: scanSettings.notifyWeekly,
    }) })
    setMessage('Sozlamalar saqlandi.')
    loadSettings()
  }

  const createApiKey = async () => {
    const response = await apiFetch<{ apiKey: { token: string } }>('/settings/api-keys', { method: 'POST', body: JSON.stringify({ name: 'Generated key' }) })
    setFreshApiKey(response.apiKey.token)
    loadSettings()
  }

  const deleteApiKey = async (id: string) => {
    await apiFetch(`/settings/api-keys/${id}`, { method: 'DELETE' })
    loadSettings()
  }

  if (!scanSettings) return <div className="text-sm text-muted-foreground">Sozlamalar yuklanmoqda...</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-4xl font-bold"><Settings className="h-8 w-8 text-primary" />Sozlamalar</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Backend saqlayotgan skan parametrlarini shu yerda boshqaring.</p>
      </div>

      {message && <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">{message}</div>}

      <Card className="sqli-card">
        <h2 className="text-2xl font-semibold">Skan sozlamalari</h2>
        <div className="mt-6 space-y-6">
          <div><label className="mb-3 block text-sm font-semibold">Maksimal vaqt</label><div className="flex items-center gap-4"><input type="range" min="60" max="3600" value={scanSettings.timeout} onChange={(event) => handleSettingChange('timeout', Number(event.target.value))} className="flex-1" /><span className="w-20 text-right text-lg font-semibold text-primary">{scanSettings.timeout}s</span></div></div>
          <div><label className="mb-3 block text-sm font-semibold">Request tezligi</label><div className="flex items-center gap-4"><input type="range" min="1" max="100" value={scanSettings.requestRate} onChange={(event) => handleSettingChange('requestRate', Number(event.target.value))} className="flex-1" /><span className="w-20 text-right text-lg font-semibold text-primary">{scanSettings.requestRate}/s</span></div></div>
          <div><label className="mb-2 block text-sm font-semibold">Risk scoring modeli</label><select value={scanSettings.riskScoringModel} onChange={(event) => handleSettingChange('riskScoringModel', event.target.value as SettingsDto['riskScoringModel'])} className="sqli-input h-11 w-full max-w-md"><option value="standard">Standart</option><option value="owasp">OWASP</option><option value="cvss">CVSS</option></select></div>
          <div className="grid gap-3 md:grid-cols-2"><label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-4"><input type="checkbox" checked={scanSettings.followRedirects} onChange={(event) => handleSettingChange('followRedirects', event.target.checked)} className="h-4 w-4 rounded border-border bg-background" /><span className="text-sm">Redirectlarni kuzatish</span></label><label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-4"><input type="checkbox" checked={scanSettings.useRandomUserAgent} onChange={(event) => handleSettingChange('useRandomUserAgent', event.target.checked)} className="h-4 w-4 rounded border-border bg-background" /><span className="text-sm">Tasodifiy User-Agent</span></label><label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-4"><input type="checkbox" checked={scanSettings.verifySsl} onChange={(event) => handleSettingChange('verifySsl', event.target.checked)} className="h-4 w-4 rounded border-border bg-background" /><span className="text-sm">SSL tekshirish</span></label></div>
          <Button onClick={saveSettings} className="sqli-button-primary h-11 w-full"><Save className="mr-2 h-4 w-4" />Sozlamalarni saqlash</Button>
        </div>
      </Card>

      <Card className="sqli-card">
        <h2 className="text-2xl font-semibold">API kalitlari</h2>
        <div className="mt-5 space-y-3">
          {apiKeys.map((key) => (
            <div key={key.id} className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/35 p-4"><div className="flex-1"><p className="font-medium">{key.name}</p><p className="text-sm text-muted-foreground">{showApiKey ? key.tokenPreview : '***************'}</p></div><button onClick={() => setShowApiKey((value) => !value)} className="rounded-xl p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground">{showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button><button onClick={() => navigator.clipboard.writeText(key.tokenPreview)} className="rounded-xl p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"><Copy className="h-4 w-4" /></button><button onClick={() => deleteApiKey(key.id)} className="rounded-xl p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button></div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row"><Button onClick={createApiKey} className="sqli-button-secondary h-11">Yangi API kaliti</Button>{freshApiKey && <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">Yangi kalit: {freshApiKey}</div>}</div>
      </Card>
    </div>
  )
}
