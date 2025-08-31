'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface Toast {
  id: string
  title: string
  description?: string
  variant: 'default' | 'destructive' | 'success' | 'warning'
  duration?: number
}

const toastQueue: Toast[] = []
const toastListeners: Array<(toasts: Toast[]) => void> = []

export const toast = (toast: Omit<Toast, 'id'>) => {
  const id = Math.random().toString(36).substring(2)
  const newToast = { ...toast, id }
  
  toastQueue.push(newToast)
  notifyListeners()
  
  if (toast.duration !== 0) {
    setTimeout(() => {
      const index = toastQueue.findIndex(t => t.id === id)
      if (index > -1) {
        toastQueue.splice(index, 1)
        notifyListeners()
      }
    }, toast.duration || 5000)
  }
}

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toastQueue]))
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts)
    toastListeners.push(listener)
    
    return () => {
      const index = toastListeners.indexOf(listener)
      if (index > -1) toastListeners.splice(index, 1)
    }
  }, [])

  const removeToast = (id: string) => {
    const index = toastQueue.findIndex(t => t.id === id)
    if (index > -1) {
      toastQueue.splice(index, 1)
      notifyListeners()
    }
  }

  const getIcon = (variant: Toast['variant']) => {
    switch (variant) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      case 'destructive':
        return <AlertCircle className="w-4 h-4" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getVariantClasses = (variant: Toast['variant']) => {
    switch (variant) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200'
      case 'destructive':
        return 'bg-red-50 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      default:
        return 'bg-white text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.3 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.5 }}
            className={`
              p-4 rounded-lg border shadow-lg backdrop-blur-sm
              ${getVariantClasses(toast.variant)}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getIcon(toast.variant)}
                <div className="flex-1">
                  <h4 className="font-medium">{toast.title}</h4>
                  {toast.description && (
                    <p className="text-sm opacity-90 mt-1">{toast.description}</p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
