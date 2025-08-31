'use client'

import { motion } from 'framer-motion'
import { Flame, Calendar } from 'lucide-react'

interface StreakTrackerProps {
  streak?: {
    current: number
    longest: number
    last_activity: string
  }
}

export function StreakTracker({ streak }: StreakTrackerProps) {
  const currentStreak = streak?.current || 0
  const longestStreak = streak?.longest || 0
  
  const getDaysOfWeek = () => {
    const today = new Date()
    const days = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      days.push({
        date,
        isActive: i < currentStreak,
        isToday: i === 0,
      })
    }
    
    return days
  }

  const days = getDaysOfWeek()

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Learning Streak</h3>
        <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
      </div>

      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-orange-500 mb-1">
          {currentStreak}
        </div>
        <p className="text-sm text-gray-600">
          {currentStreak === 1 ? 'day' : 'days'} in a row
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Best: {longestStreak} days
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          This Week
        </h4>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                ${day.isActive 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-500'
                }
                ${day.isToday ? 'ring-2 ring-orange-300' : ''}
              `}
            >
              {day.date.getDate()}
            </motion.div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-500">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((letter, index) => (
            <div key={index} className="text-center">
              {letter}
            </div>
          ))}
        </div>
      </div>

      {currentStreak === 0 && (
        <div className="mt-4 p-3 bg-orange-50 rounded-lg text-center">
          <p className="text-sm text-orange-700">
            Start learning today to begin your streak! 🔥
          </p>
        </div>
      )}
    </div>
  )
}
