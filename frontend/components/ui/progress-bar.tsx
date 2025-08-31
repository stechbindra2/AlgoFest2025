'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  className?: string
  color?: 'primary' | 'green' | 'yellow' | 'red' | 'blue'
  showLabel?: boolean
}

export function ProgressBar({ 
  progress, 
  className, 
  color = 'primary',
  showLabel = false 
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  
  const colorClasses = {
    primary: 'bg-primary-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div 
          className={cn('h-full rounded-full', colorClasses[color])}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}
