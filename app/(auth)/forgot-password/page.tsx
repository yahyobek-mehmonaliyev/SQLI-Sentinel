'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Shield, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const response = await apiFetch<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage(response.message)
      setSubmitted(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'So\'rov bajarilmadi.')
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/15">
            <CheckCircle className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="text-3xl font-semibold">Email yuborildi</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>

        <Card className="sqli-card text-center">
          <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-1 h-11 w-full border-border/80 bg-card/60">
            Boshqa email kiritish
          </Button>
        </Card>

        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Kirish sahifasiga qaytish
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-semibold">Parolni tiklash</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hisobingizga bog'langan emailni kiriting, sizga tiklash havolasini yuboramiz.</p>
      </div>

      <Card className="sqli-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <div className="relative">
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="sqli-input h-11 w-full pl-10" />
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="sqli-button-primary h-11 w-full">
            Havolani yuborish
          </Button>
        </form>
      </Card>

      <div className="text-center">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Kirish sahifasiga qaytish
        </Link>
      </div>
    </div>
  )
}
