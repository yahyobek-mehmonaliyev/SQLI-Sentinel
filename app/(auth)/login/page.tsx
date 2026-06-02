'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { apiFetch, setStoredToken } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('admin@sqli-sentinel.local')
  const [password, setPassword] = useState('Admin123!')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await apiFetch<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setStoredToken(response.token)
      router.push('/dashboard')
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Kirish amalga oshmadi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-semibold">Kirish</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hisobingizga kirib scanner va monitoring bo'limlarini boshqaring.</p>
      </div>

      <Card className="sqli-card gap-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="sqli-input h-11 w-full" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium">Parol</label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Parolni unutdingizmi?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="sqli-input h-11 w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <Button type="submit" disabled={loading} className="sqli-button-primary h-11 w-full">
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Hisobingiz yo'qmi?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Ro'yxatdan o'ting
        </Link>
      </p>
    </div>
  )
}
