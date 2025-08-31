import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - FinQuest',
  description: 'Sign in or create your FinQuest account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-layout">
      {children}
    </div>
  )
}
