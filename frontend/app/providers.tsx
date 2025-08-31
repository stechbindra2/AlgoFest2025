'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { apiClient } from '@/lib/api'
import { Toaster } from '@/components/ui/toaster'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper>
        {children}
        <Toaster />
      </AuthWrapper>
    </QueryClientProvider>
  )
}

function AuthWrapper({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/'
      const isAuthenticated = apiClient.isAuthenticated()

      // If not authenticated and not on auth page, redirect to login
      if (!isAuthenticated && !isAuthPage) {
        router.push('/auth/login')
      }
      // If authenticated and on auth page, redirect to dashboard
      else if (isAuthenticated && isAuthPage && pathname !== '/') {
        router.push('/dashboard')
      }

      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [pathname, router])

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading FinQuest...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
