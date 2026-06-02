// 'use client';

// import { ReactNode, useEffect, useMemo, useState } from 'react';
// import Link from 'next/link';
// import { usePathname, useRouter } from 'next/navigation';
// import {
//   LayoutDashboard,
//   Crosshair,
//   Wand2,
//   Monitor,
//   BarChart3,
//   FileText,
//   Settings,
//   Menu,
//   X,
//   Bell,
//   LogOut,
//   KeyRound,
//   Shield,
//   Sparkles,
//   ChevronRight,
// } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { apiFetch, clearStoredToken, getStoredToken } from '@/lib/api';
// import type { AuthSessionDto } from '@/lib/api-types';
// import { cn } from '@/lib/utils';

// const navigationItems = [
//   { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
//   { label: 'Skaner', href: '/scanner', icon: Crosshair },
//   { label: 'Payloadlar', href: '/payloads', icon: Wand2 },
//   { label: 'Monitoring', href: '/monitor', icon: Monitor },
//   { label: 'Tahlil', href: '/analytics', icon: BarChart3 },
//   { label: 'Hisobotlar', href: '/reports', icon: FileText },
//   { label: 'AI Tavsiyalar', href: '/ai-assistant', icon: Sparkles },
//   { label: 'Sozlamalar', href: '/settings', icon: Settings },
// ];

// export default function DashboardLayout({ children }: { children: ReactNode }) {
//   const pathname = usePathname();
//   const router = useRouter();
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [sessionState, setSessionState] = useState<AuthSessionDto | null>(null);
//   const [sessionLoading, setSessionLoading] = useState(true);
//   const [logoutLoading, setLogoutLoading] = useState(false);

//   useEffect(() => {
//     const token = getStoredToken();
//     if (!token) {
//       router.replace('/login');
//       setSessionLoading(false);
//       return;
//     }

//     let cancelled = false;
//     apiFetch<AuthSessionDto>('/auth/me')
//       .then((response) => {
//         if (cancelled) return;
//         setSessionState(response);
//         setSessionLoading(false);
//       })
//       .catch(() => {
//         clearStoredToken();
//         if (cancelled) return;
//         setSessionLoading(false);
//         router.replace('/login');
//       });

//     return () => {
//       cancelled = true;
//     };
//   }, [router]);

//   const activeItem = useMemo(
//     () => navigationItems.find((item) => pathname === item.href) ?? navigationItems[0],
//     [pathname]
//   );

//   const initials = useMemo(() => {
//     const label = sessionState?.user.name?.trim() ?? 'User';
//     return label
//       .split(/\s+/)
//       .slice(0, 2)
//       .map((item) => item[0]?.toUpperCase() ?? '')
//       .join('');
//   }, [sessionState]);

//   const handleLogout = async () => {
//     setLogoutLoading(true);
//     try {
//       await apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
//     } catch {
//       // Session may already be gone. We still clear local state to recover cleanly.
//     } finally {
//       clearStoredToken();
//       setSessionState(null);
//       setLogoutLoading(false);
//       router.push('/login');
//       router.refresh();
//     }
//   };

//   if (sessionLoading) {
//     return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Sessiya tekshirilmoqda...</div>;
//   }

//   if (!sessionState) {
//     return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Kirish sahifasiga yo'naltirilmoqda...</div>;
//   }

//   return (
//     <div className="min-h-screen bg-background text-foreground">
//       {sidebarOpen && (
//         <button
//           aria-label="Sidebar yopish"
//           className="fixed inset-0 z-40 bg-black/60 lg:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       <div className="mx-auto flex min-h-screen max-w-[1600px]">
//         <aside
//           className={cn(
//             'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/70 bg-[#0c132b]/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0',
//             sidebarOpen ? 'translate-x-0' : '-translate-x-full'
//           )}
//         >
//           <div className="flex h-[72px] items-center justify-between border-b border-border/70 px-5 py-4">
//             <Link href="/dashboard" className="flex items-center gap-3">
//               <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 shadow-lg shadow-primary/10">
//                 <Shield className="h-6 w-6 text-primary" />
//               </div>
//               <div>
//                 <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Security Hub</p>
//                 <p className="text-lg font-semibold">SQLI Sentinel</p>
//               </div>
//             </Link>
//             <button
//               aria-label="Sidebar yopish"
//               className="rounded-xl p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground lg:hidden"
//               onClick={() => setSidebarOpen(false)}
//             >
//               <X className="h-5 w-5" />
//             </button>
//           </div>

//           <div className="border-b border-border/70 px-5 py-5">
//             <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
//               <div className="mb-3 flex items-center justify-between">
//                 <span className="text-xs uppercase tracking-[0.2em] text-primary/70">Session</span>
//                 <span className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-2.5 py-1 text-[11px] text-secondary">
//                   <span className="h-2 w-2 rounded-full bg-secondary" />
//                   Faol
//                 </span>
//               </div>
//               <p className="font-medium">{sessionState.user.name}</p>
//               <p className="mt-1 text-sm text-muted-foreground">{sessionState.user.email}</p>
//               <p className="mt-3 text-sm text-muted-foreground">Rol: {sessionState.user.role}</p>
//               <p className="mt-1 text-xs text-muted-foreground">
//                 Sessiya tugashi: {new Date(sessionState.session.expiresAt).toLocaleString('uz-UZ')}
//               </p>
//             </div>
//           </div>

//           <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
//             {navigationItems.map((item) => {
//               const Icon = item.icon;
//               const isActive = pathname === item.href;

//               return (
//                 <Link
//                   key={item.href}
//                   href={item.href}
//                   onClick={() => setSidebarOpen(false)}
//                   className={cn(
//                     'group flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition',
//                     isActive
//                       ? 'bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_rgba(0,217,255,0.18)]'
//                       : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
//                   )}
//                 >
//                   <span className="flex items-center gap-3">
//                     <span
//                       className={cn(
//                         'flex h-10 w-10 items-center justify-center rounded-xl transition',
//                         isActive ? 'bg-primary/12 text-primary' : 'bg-white/5 text-muted-foreground group-hover:text-primary'
//                       )}
//                     >
//                       <Icon className="h-5 w-5" />
//                     </span>
//                     <span>{item.label}</span>
//                   </span>
//                   <ChevronRight className={cn('h-4 w-4 transition', isActive ? 'text-primary' : 'opacity-0 group-hover:opacity-100')} />
//                 </Link>
//               );
//             })}
//           </nav>

//           <div className="border-t border-border/70 p-4">
//             <Link href="/settings" className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
//               <KeyRound className="h-5 w-5" />
//               <span>API kaliti</span>
//             </Link>
//             <button
//               onClick={handleLogout}
//               disabled={logoutLoading}
//               className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-70"
//             >
//               <LogOut className="h-5 w-5" />
//               <span>{logoutLoading ? 'Chiqilmoqda...' : 'Tizimdan chiqish'}</span>
//             </button>
//           </div>
//         </aside>

//         <div className="flex min-h-screen flex-1 flex-col">
//           <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
//             <div className="flex h-[72px] items-center justify-between gap-4 px-4 py-4 lg:px-8">
//               <div className="flex items-center gap-3">
//                 <button
//                   aria-label="Sidebar ochish"
//                   className="rounded-xl border border-border/70 bg-card/80 p-2 text-muted-foreground transition hover:text-foreground lg:hidden"
//                   onClick={() => setSidebarOpen((value) => !value)}
//                 >
//                   <Menu className="h-5 w-5" />
//                 </button>
//                 <div>
//                   <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Current View</p>
//                   <h1 className="text-lg font-semibold">{activeItem.label}</h1>
//                 </div>
//               </div>

//               <div className="flex items-center gap-3">
//                 <div className="hidden rounded-2xl border border-border/70 bg-card/70 px-4 py-2 text-right sm:block">
//                   <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Xavf holati</p>
//                   <p className="text-sm font-medium text-secondary">Sessiya va backend aktiv</p>
//                 </div>
//                 <Button variant="outline" size="icon" className="rounded-xl border-border/70 bg-card/80">
//                   <Bell className="h-5 w-5" />
//                 </Button>
//                 <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 font-semibold text-primary">
//                   {initials || 'SS'}
//                 </div>
//               </div>
//             </div>
//           </header>

//           <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
//         </div>
//       </div>
//     </div>
//   );
// }


'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Crosshair,
  Wand2,
  Monitor,
  BarChart3,
  FileText,
  Settings,
  Menu,
  X,
  Bell,
  LogOut,
  KeyRound,
  Shield,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { apiFetch, clearStoredToken, getStoredToken } from '@/lib/api';
import type { AuthSessionDto } from '@/lib/api-types';
import { cn } from '@/lib/utils';

const navigationItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Skaner', href: '/scanner', icon: Crosshair },
  { label: 'Payloadlar', href: '/payloads', icon: Wand2 },
  { label: 'Monitoring', href: '/monitor', icon: Monitor },
  { label: 'Tahlil', href: '/analytics', icon: BarChart3 },
  { label: 'Hisobotlar', href: '/reports', icon: FileText },
  { label: 'AI Tavsiyalar', href: '/ai-assistant', icon: Sparkles },
  { label: 'Sozlamalar', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionState, setSessionState] = useState<AuthSessionDto | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      setSessionLoading(false);
      return;
    }

    let cancelled = false;
    apiFetch<AuthSessionDto>('/auth/me')
      .then((response) => {
        if (cancelled) return;
        setSessionState(response);
        setSessionLoading(false);
      })
      .catch(() => {
        clearStoredToken();
        if (cancelled) return;
        setSessionLoading(false);
        router.replace('/login');
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const activeItem = useMemo(
    () => navigationItems.find((item) => pathname === item.href) ?? navigationItems[0],
    [pathname]
  );

  const initials = useMemo(() => {
    const label = sessionState?.user.name?.trim() ?? 'User';
    return label
      .split(/\s+/)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase() ?? '')
      .join('');
  }, [sessionState]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
    } catch {
      // Session may already be gone. We still clear local state to recover cleanly.
    } finally {
      clearStoredToken();
      setSessionState(null);
      setLogoutLoading(false);
      router.push('/login');
      router.refresh();
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Sessiya tekshirilmoqda...
        </div>
      </div>
    );
  }

  if (!sessionState) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Kirish sahifasiga yo&apos;naltirilmoqda...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {sidebarOpen && (
        <button
          aria-label="Sidebar yopish"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/70 bg-[#0c132b]/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-[72px] items-center justify-between border-b border-border/70 px-5 py-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 shadow-lg shadow-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Security Hub</p>
                <p className="text-lg font-semibold">SQLI Sentinel</p>
              </div>
            </Link>

            <button
              aria-label="Sidebar yopish"
              className="rounded-xl p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-border/70 px-5 py-5">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-primary/70">Session</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-2.5 py-1 text-[11px] text-secondary">
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                  Faol
                </span>
              </div>
              <p className="font-medium">{sessionState.user.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{sessionState.user.email}</p>
              <p className="mt-3 text-sm text-muted-foreground">Rol: {sessionState.user.role}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sessiya tugashi: {new Date(sessionState.session.expiresAt).toLocaleString('uz-UZ')}
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'group flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition',
                    isActive
                      ? 'bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_rgba(0,217,255,0.18)]'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition',
                        isActive ? 'bg-primary/12 text-primary' : 'bg-white/5 text-muted-foreground group-hover:text-primary'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>{item.label}</span>
                  </span>
                  <ChevronRight className={cn('h-4 w-4 transition', isActive ? 'text-primary' : 'opacity-0 group-hover:opacity-100')} />
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border/70 p-4">
            <Link
              href="/settings"
              className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            >
              <KeyRound className="h-5 w-5" />
              <span>API kaliti</span>
            </Link>
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogOut className="h-5 w-5" />
              <span>{logoutLoading ? 'Chiqilmoqda...' : 'Tizimdan chiqish'}</span>
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
            <div className="flex h-[72px] items-center justify-between gap-4 px-4 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  aria-label="Sidebar ochish"
                  className="rounded-xl border border-border/70 bg-card/80 p-2 text-muted-foreground transition hover:text-foreground lg:hidden"
                  onClick={() => setSidebarOpen((value) => !value)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-primary/70">Current View</p>
                  <h1 className="text-lg font-semibold">{activeItem.label}</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-2xl border border-border/70 bg-card/70 px-4 py-2 text-right sm:block">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Xavf holati</p>
                  <p className="text-sm font-medium text-secondary">Sessiya va backend aktiv</p>
                </div>
                <Button variant="outline" size="icon" className="rounded-xl border-border/70 bg-card/80">
                  <Bell className="h-5 w-5" />
                </Button>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 font-semibold text-primary">
                  {initials || 'SS'}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}