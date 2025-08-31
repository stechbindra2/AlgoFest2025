import type { Metadata } from 'next'
import { Inter, Comic_Neue, Fredoka } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })
const comicNeue = Comic_Neue({ 
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-comic-neue'
})
const fredokaOne = Fredoka({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-fredoka-one'
})

export const metadata: Metadata = {
  title: 'FinQuest - AI-Powered Financial Learning',
  description: 'Gamified personal finance learning platform for students',
  keywords: ['finance', 'education', 'learning', 'AI', 'gamification'],
  authors: [{ name: 'FinQuest Team' }],
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://finquest.app',
    title: 'FinQuest - Learn Finance Through Adventure!',
    description: 'AI-powered gamified personal finance learning platform for kids',
    siteName: 'FinQuest',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinQuest - Learn Finance Through Adventure!',
    description: 'AI-powered gamified personal finance learning platform for kids',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${comicNeue.variable} ${fredokaOne.variable}`}>
      <body className="font-sans bg-gradient-to-br from-background-primary via-background-secondary to-primary-50 min-h-screen">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
// Remove this duplicate RootLayout function as we already have one defined above
