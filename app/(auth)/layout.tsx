import { ReactNode } from 'react';
import { Shield, Sparkles, Radar } from 'lucide-react';

const highlights = [
  {
    icon: Shield,
    title: 'Xavfsizlik markazi',
    description: 'SQL injection zaifliklarini tez topish va prioritetlash uchun yagona panel.',
  },
  {
    icon: Radar,
    title: 'Jonli monitoring',
    description: "Payloadlar, request loglari va response patternlar real vaqtga yaqin ko'rinishda.",
  },
  {
    icon: Sparkles,
    title: 'AI tavsiyalar',
    description: 'Analitiklar uchun remediation va triage tavsiyalari front interfeysda jamlangan.',
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[32px] border border-border/70 bg-card/60 shadow-2xl shadow-black/20 backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden overflow-hidden border-r border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(0,217,255,0.18),transparent_34%),linear-gradient(180deg,#0d1735_0%,#0a1027_100%)] p-10 lg:flex lg:flex-col">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary/70">Platform</p>
              <h1 className="text-2xl font-semibold">SQLI Sentinel</h1>
            </div>
          </div>

          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              Defensive testing workflow
            </p>
            <h2 className="mt-6 text-5xl font-semibold leading-tight">
              SQL injection tahlili uchun tezkor va toza frontend oqimi.
            </h2>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              Analitik, developer va pentester jamoalar uchun yagona dashboard, scanner va AI tavsiya moduli.
            </p>
          </div>

          <div className="mt-auto grid gap-4">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
