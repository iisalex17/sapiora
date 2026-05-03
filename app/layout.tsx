import type { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sapiora',
  description: 'AI-powered expansion intelligence for hospitality',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{margin:0, fontFamily:'Montserrat, sans-serif'}}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}