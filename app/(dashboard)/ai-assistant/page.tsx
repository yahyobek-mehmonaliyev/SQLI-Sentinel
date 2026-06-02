'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sparkles, ShieldAlert, Wand2, Bot, Send, CheckCircle2, Lightbulb } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { AiPromptOptimizationResponseDto, AiRecommendationResponseDto } from '@/lib/api-types'

type AssistantMode = 'triage' | 'remediation' | 'false-positive'

export default function AiAssistantPage() {
  const [mode, setMode] = useState<AssistantMode>('triage')
  const [target, setTarget] = useState('https://example.com/login')
  const [prompt, setPrompt] = useState('Login endpoint uchun kritik topilmalarni qisqa prioritetlab bering.')
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState('')
  const [optimization, setOptimization] = useState<AiPromptOptimizationResponseDto | null>(null)
  const [result, setResult] = useState<AiRecommendationResponseDto | null>(null)

  const runRecommendation = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch<AiRecommendationResponseDto>('/ai/recommendations', {
        method: 'POST',
        body: JSON.stringify({ mode, target, prompt, include_monitor_data: true }),
      })
      setResult(response)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'AI tavsiya olinmadi.')
    } finally {
      setLoading(false)
    }
  }

  const optimizePrompt = async () => {
    setOptimizing(true)
    setError('')
    try {
      const response = await apiFetch<AiPromptOptimizationResponseDto>('/ai/prompt-optimizer', {
        method: 'POST',
        body: JSON.stringify({ mode, target, prompt }),
      })
      setOptimization(response)
      setPrompt(response.optimizedPrompt)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Prompt optimallashtirilmadi.')
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-bold"><Sparkles className="h-8 w-8 text-primary" />AI tavsiya markazi</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">Gemini yoki fallback advisor orqali triage, remediation va false-positive tavsiyalari yaratiladi.</p>
        </div>
        <Card className="sqli-card gap-2 p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Provider</p><p className="text-2xl font-semibold text-secondary">{result?.provider ?? optimization?.provider ?? 'Gemini/Fallback'}</p></Card>
      </div>

      {error && <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="sqli-card">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10"><Bot className="h-5 w-5 text-primary" /></div><div><h2 className="text-2xl font-semibold">Prompt workspace</h2><p className="text-sm text-muted-foreground">AI operator uchun prompt, target va rejim.</p></div></div>
          <div className="mt-6 space-y-6">
            <div className="grid gap-3 md:grid-cols-3">{(['triage', 'remediation', 'false-positive'] as AssistantMode[]).map((item) => (<button key={item} onClick={() => setMode(item)} className={`rounded-2xl border p-4 text-left transition ${mode === item ? 'border-primary bg-primary/10' : 'border-border/70 bg-background/35 hover:border-primary/40'}`}><p className="font-medium">{item}</p></button>))}</div>
            <div><label className="mb-2 block text-sm font-semibold">Target endpoint</label><Input value={target} onChange={(event) => setTarget(event.target.value)} className="sqli-input h-11 w-full" /></div>
            <div><label className="mb-2 block text-sm font-semibold">AI prompt</label><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="sqli-input min-h-36 w-full resize-none" /></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={runRecommendation} disabled={loading} className="sqli-button-primary h-11 flex-1">{loading ? 'Yuklanmoqda...' : <><Send className="mr-2 h-4 w-4" />Tavsiya generatsiya qilish</>}</Button>
              <Button onClick={optimizePrompt} disabled={optimizing} variant="outline" className="h-11 border-border/80 bg-card/60 sm:min-w-48">{optimizing ? 'Optimallashtirilmoqda...' : <><Wand2 className="mr-2 h-4 w-4" />Promptni yaxshilash</>}</Button>
            </div>
          </div>
        </Card>

        <Card className="sqli-card">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10"><ShieldAlert className="h-5 w-5 text-destructive" /></div><div><h2 className="text-2xl font-semibold">Asosiy kontekst</h2><p className="text-sm text-muted-foreground">Top finding va monitor loglardan qisqacha kontekst.</p></div></div>
          {result?.context.topFinding ? <div className="mt-6 rounded-2xl border border-border/70 bg-background/35 p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Top finding</p><h3 className="mt-1 font-semibold text-primary">{result.context.topFinding.url}</h3><p className="mt-2 text-sm text-muted-foreground">Parametr: {result.context.topFinding.parameter}</p><p className="mt-1 text-sm text-muted-foreground">Severity: {result.context.topFinding.severity} | Type: {result.context.topFinding.payloadType}</p><div className="mt-4 rounded-xl bg-black/30 p-3 font-mono text-xs text-primary/80">{result.context.topFinding.payload}</div></div> : <div className="mt-6 text-sm text-muted-foreground">Tavsiya yaratilgach kontekst shu yerda ko'rinadi.</div>}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="sqli-card">
          <h2 className="text-2xl font-semibold">AI tavsiyalar</h2>
          <div className="mt-5 space-y-3">{(result?.recommendations ?? []).map((item) => (<div key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/35 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" /><p className="text-sm text-muted-foreground">{item}</p></div>))}</div>
          {!result && <p className="mt-5 text-sm text-muted-foreground">Tavsiyalar shu yerda chiqadi. Prompt optimizatsiyasidan keyin qayta generatsiya qilish tavsiya etiladi.</p>}
        </Card>
        <Card className="sqli-card">
          <h2 className="text-2xl font-semibold">Prompt optimizatsiyasi</h2>
          {optimization ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-muted-foreground">{optimization.optimizedPrompt}</div>
              {optimization.improvements.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/35 p-4 text-sm text-muted-foreground"><Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />{item}</div>
              ))}
              <div className="rounded-2xl border border-border/70 bg-background/35 p-4 text-sm text-muted-foreground">Model: {optimization.model}<br />Provider: {optimization.provider}</div>
            </div>
          ) : <div className="mt-5 rounded-2xl border border-dashed border-border/70 bg-background/25 p-4 text-sm text-muted-foreground">Promptni yaxshilash tugmasi bosilgach AI operator uchun optimallashtirilgan prompt shu bo'limda chiqadi.</div>}
        </Card>
      </div>
    </div>
  )
}
