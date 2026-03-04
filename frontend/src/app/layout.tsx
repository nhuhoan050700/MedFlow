import type { Metadata, Viewport } from 'next'
import GoogleOAuthProviderWrapper from '@/components/GoogleOAuthProviderWrapper'
import GoogleTag from '@/components/GoogleTag'
import { LanguageProvider } from '@/contexts/LanguageContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'MedFlow',
  description: 'QR-based patient check-in and visit flow',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  userScalable: true,
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  return (
    <html lang="en" className="overflow-x-hidden">
      <body className="overflow-x-hidden antialiased">
        <GoogleTag />
        <GoogleOAuthProviderWrapper clientId={googleClientId}>
          <LanguageProvider>
            <div className="min-w-0 overflow-x-hidden max-w-[100vw]">
              {children}
            </div>
          </LanguageProvider>
        </GoogleOAuthProviderWrapper>
      </body>
    </html>
  )
}
