'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wand2, Plus, Copy, ToggleLeft, ToggleRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { PayloadDto } from '@/lib/api-types'
import type { PayloadType } from '@/lib/types'

const payloadTypes: PayloadType[] = ['Error-based', 'Union-based', 'Boolean-based', 'Time-based']

export default function PayloadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<PayloadType | 'All'>('All')
  const [payloads, setPayloads] = useState<PayloadDto[]>([])
  const [message, setMessage] = useState('')

  const loadPayloads = () => {
    const query = selectedType === 'All' ? '' : `?payload_type=${encodeURIComponent(selectedType)}`
    apiFetch<{ payloads: PayloadDto[] }>(`/payloads${query}`).then((response) => setPayloads(response.payloads)).catch(() => setMessage('Payloadlarni yuklab bo\'lmadi.'))
  }

  useEffect(() => {
    loadPayloads()
  }, [selectedType])

  const filteredPayloads = useMemo(() => {
    return payloads.filter((payload) => payload.payload.toLowerCase().includes(searchTerm.toLowerCase()) || payload.description.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [payloads, searchTerm])

  const togglePayload = async (id: string, enabled: boolean) => {
    await apiFetch(`/payloads/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !enabled }) })
    loadPayloads()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-bold"><Wand2 className="h-8 w-8 text-secondary" />Payload kutubxonasi</h1>
          <p className="mt-2 text-muted-foreground">Backend saqlayotgan payloadlar bilan ishlang.</p>
        </div>
        <Button className="sqli-button-secondary h-11"><Plus className="mr-2 h-4 w-4" />Yangi payload</Button>
      </div>

      <Card className="sqli-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex-1"><Input placeholder="Payload yoki tavsif bo'yicha qidirish..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="sqli-input h-11 w-full" /></div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSelectedType('All')} variant={selectedType === 'All' ? 'default' : 'outline'} className={selectedType === 'All' ? 'sqli-button-primary' : 'border-border/80 bg-card/60'}>Barchasi</Button>
            {payloadTypes.map((type) => (<Button key={type} onClick={() => setSelectedType(type)} variant={selectedType === type ? 'default' : 'outline'} className={selectedType === type ? 'sqli-button-secondary' : 'border-border/80 bg-card/60'}>{type}</Button>))}
          </div>
        </div>
      </Card>

      {message && <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">{message}</div>}

      <div className="space-y-3">
        {filteredPayloads.map((payload) => (
          <Card key={payload.id} className="sqli-card">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{payload.type}</div>
              <div className="flex-1"><h3 className="font-semibold">{payload.description}</h3><div className="mt-3 rounded-2xl bg-black/30 p-3 font-mono text-xs text-primary/80">{payload.payload}</div><div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground"><span>Kategoriya: {payload.category}</span><span>Muvaffaqiyat: {payload.successRate}%</span><span>Holat: {payload.enabled ? 'Faol' : 'Nofaol'}</span></div></div>
              <div className="flex gap-2 xl:flex-col"><button onClick={() => navigator.clipboard.writeText(payload.payload)} className="rounded-xl p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"><Copy className="h-4 w-4" /></button><button onClick={() => togglePayload(payload.id, payload.enabled)} className={`rounded-xl p-2 transition ${payload.enabled ? 'bg-secondary/10 text-secondary' : 'text-muted-foreground hover:bg-primary/10'}`}>{payload.enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}</button></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
