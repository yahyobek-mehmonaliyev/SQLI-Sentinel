import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'SQLI Sentinel',
    template: '%s | SQLI Sentinel',
  },
  description: 'Avtomatlashtirilgan SQL Injection aniqlash platformasi',
  applicationName: 'SQLI Sentinel',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="uz" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
