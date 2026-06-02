'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { apiFetch, setStoredToken } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError('Parollar mos emas.')
      return
    }
    if (!formData.agreeTerms) {
      setError('Davom etish uchun shartlarni qabul qiling.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await apiFetch<{ token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })
      setStoredToken(response.token)
      router.push('/dashboard')
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ro\'yxatdan o\'tish amalga oshmadi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/15">
          <Shield className="h-7 w-7 text-secondary" />
        </div>
        <h1 className="text-3xl font-semibold">Ro'yxatdan o'tish</h1>
        <p className="mt-2 text-sm text-muted-foreground">Yangi jamoa a'zosi sifatida scanner va AI tavsiyalar moduliga kirish oling.</p>
      </div>

      <Card className="sqli-card gap-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">To'liq ism</label>
            <Input type="text" name="name" value={formData.name} onChange={handleChange} className="sqli-input h-11 w-full" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <Input type="email" name="email" value={formData.email} onChange={handleChange} className="sqli-input h-11 w-full" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Parol</label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="sqli-input h-11 w-full pr-10" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Parolni tasdiqlang</label>
            <div className="relative">
              <Input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="sqli-input h-11 w-full pr-10" />
              <button type="button" onClick={() => setShowConfirm((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} className="mt-1 h-4 w-4 rounded border-border bg-background" />
            <span>Men foydalanish shartlari va maxfiylik siyosati bilan roziman.</span>
          </label>

          {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <Button type="submit" disabled={loading} className="sqli-button-primary h-11 w-full">
            {loading ? 'Yaratilmoqda...' : 'Hisob yaratish'}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Allaqachon hisobingiz bormi?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Kirish
        </Link>
      </p>
    </div>
  )
}
