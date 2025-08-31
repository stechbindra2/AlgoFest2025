'use client'

import { useState, useCallback } from 'react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

const toasts: Toast[] = []

export function useToast() {
  const [, forceUpdate] = useState({})

  const toast = useCallback(({
    title,
    description,
    variant = 'default',
    duration = 5000
  }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, title, description, variant, duration }
    
    toasts.push(newToast)
    forceUpdate({})
    
    // Auto remove after duration
    setTimeout(() => {
      const index = toasts.findIndex(t => t.id === id)
      if (index > -1) {
        toasts.splice(index, 1)
        forceUpdate({})
      }
    }, duration)

    // For now, just log to console
    console.log(`Toast: ${title}`, description)
  }, [])

  return { toast }
}
