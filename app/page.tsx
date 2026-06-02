'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Shield, Zap, BarChart3, Lock, Search, Target, Sparkles, Radar } from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'SQLi turlarini qamrab olish',
    description: 'Error-based, union-based, boolean-based va time-based topilmalarni bir xil oqimda tahlil qiling.',
  },
  {
    icon: Zap,
    title: 'Avtomatlashtirilgan skan',
    description: "Payload strategiyasi, request chuqurligi va parametrlarga ko'ra tezkor tekshiruv yarating.",
  },
  {
    icon: Radar,
    title: 'Real-time monitoring',
    description: 'Request loglari, javob naqshlari va xavf triggerlarini panel ichida kuzating.',
  },
  {
    icon: Lock,
    title: 'Risk scoring',
    description: "OWASP va CVSS ga yaqin ko'rsatkichlar bilan topilmalarni ustuvorlashtiring.",
  },
  {
    icon: Search,
    title: 'Payload kutubxonasi',
    description: 'Tayyor payloadlar, filterlash va faol/nofaol boshqaruvni front interfeysda olib boring.',
  },
  {
    icon: Sparkles,
    title: 'AI tavsiyalar',
    description: "Frontend ichida triage, remediation va false positive review bo'limlarini oching.",
  },
];

const workflow = [
  {
    step: '01',
    title: 'Targetni kiriting',
    description: 'URL, parametr va request metodlarini aniq belgilang.',
  },
  {
    step: '02',
    title: 'Skan rejimini tanlang',
    description: 'Konservativ, muvozanatli yoki tajovuzkor payload strategiyasini tanlang.',
  },
  {
    step: '03',
    title: 'Tahlil va hisobot oling',
    description: 'Dashboard, monitoring va AI tavsiyalar moduli orqali qaror chiqaring.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-primary/70">Security Platform</p>
              <span className="text-lg font-semibold">SQLI Sentinel</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" className="border-border/80 bg-card/60">
                Kirish
              </Button>
            </Link>
            <Link href="/register">
              <Button className="sqli-button-primary">Ro'yxatdan o'tish</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="border-b border-border/70 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
              <Zap className="h-4 w-4" />
              SQL injection aniqlash va AI-assisted triage
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight sm:text-6xl">
              SQLI Sentinel bilan xavfli kirish nuqtalarini tezroq toping.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Scanner, monitoring, payload boshqaruvi va AI tavsiyalar moduli birlashtirilgan zamonaviy frontend.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button className="sqli-button-primary h-12 px-6">
                  Boshlash <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="h-12 border-border/80 bg-card/60 px-6">
                  Platformani ko'rish
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Skanlar', value: '47+' },
                { label: 'Aniqlangan zaifliklar', value: '23' },
                { label: 'AI templates', value: '3' },
              ].map((item) => (
                <Card key={item.label} className="sqli-card gap-1 p-4">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-3xl font-semibold text-primary">{item.value}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="sqli-card relative overflow-hidden border-primary/20 bg-[linear-gradient(180deg,rgba(20,24,41,0.96),rgba(12,19,43,0.96))]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,217,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,245,156,0.16),transparent_26%)]" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/20 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live status</p>
                  <p className="mt-1 text-lg font-semibold">Monitoring barqaror</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-sm text-secondary">
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                  Active
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
                  <p className="text-sm text-muted-foreground">Top finding</p>
                  <p className="mt-2 font-semibold text-destructive">query parameter SQLi</p>
                  <p className="mt-1 text-xs text-muted-foreground">Risk score: 95</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
                  <p className="text-sm text-muted-foreground">AI action</p>
                  <p className="mt-2 font-semibold text-primary">Patch tavsiyasi tayyor</p>
                  <p className="mt-1 text-xs text-muted-foreground">Prepared statements + validation</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium">Haftalik trend</span>
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[42, 56, 34, 68, 61, 74, 59].map((value, index) => (
                    <div key={value + index} className="flex flex-col items-center gap-2">
                      <div className="flex h-32 w-full items-end rounded-xl bg-background/30 p-1">
                        <div
                          className="w-full rounded-lg bg-gradient-to-t from-primary to-secondary"
                          style={{ height: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-b border-border/70 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.22em] text-primary/70">Capabilities</p>
            <h2 className="mt-3 text-4xl font-semibold">Frontend ichida to'liq security workflow</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="sqli-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/70 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.22em] text-primary/70">Workflow</p>
            <h2 className="mt-3 text-4xl font-semibold">Qanday ishlaydi?</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {workflow.map((item) => (
              <Card key={item.step} className="sqli-card">
                <p className="text-sm font-semibold text-primary">{item.step}</p>
                <h3 className="mt-4 text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-4xl font-semibold">Scanner, monitoring va AI tavsiya modulini bir joyda ishga tushiring.</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            SQLI Sentinel frontendi xavfsizlik jamoasiga tahlil qilish, prioritetlash va yetkazib berish jarayonini soddalashtiradi.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button className="sqli-button-primary h-12 px-6">
                Bepul boshlash <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/ai-assistant">
              <Button variant="outline" className="h-12 border-border/80 bg-card/60 px-6">
                AI bo'limini ko'rish
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">SQLI Sentinel</span>
          </div>
          <p className="text-sm text-muted-foreground">(c) 2026 SQLI Sentinel. Barcha huquqlar himoyalangan.</p>
        </div>
      </footer>
    </div>
  );
}
