'use client'

import { motion } from 'framer-motion'
import { Sparkles, Play, Book } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EngagementBoostProps {
  content: {
    type: 'story' | 'game' | 'celebration' | 'encouragement'
    content: string
    duration_minutes: number
  }
  onComplete: () => void
}

export function EngagementBoost({ content, onComplete }: EngagementBoostProps) {
  const getIcon = () => {
    switch (content.type) {
      case 'story':
        return <Book className="w-8 h-8" />
      case 'game':
        return <Play className="w-8 h-8" />
      case 'celebration':
        return <Sparkles className="w-8 h-8" />
      default:
        return <Sparkles className="w-8 h-8" />
    }
  }

  const getTitle = () => {
    switch (content.type) {
      case 'story':
        return 'Story Time! 📚'
      case 'game':
        return 'Mini-Game Unlocked! 🎮'
      case 'celebration':
        return 'Amazing Work! 🎉'
      default:
        return 'Keep Going! 💪'
    }
  }

  const getColor = () => {
    switch (content.type) {
      case 'story':
        return 'from-blue-400 to-blue-600'
      case 'game':
        return 'from-purple-400 to-purple-600'
      case 'celebration':
        return 'from-yellow-400 to-orange-500'
      default:
        return 'from-green-400 to-green-600'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-xl"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className={`w-16 h-16 rounded-full bg-gradient-to-r ${getColor()} text-white flex items-center justify-center mx-auto mb-6`}
          >
            {getIcon()}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-800 mb-4"
          >
            {getTitle()}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 rounded-xl p-6 mb-6"
          >
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {content.content}
            </p>
          </motion.div>

          <div className="text-sm text-gray-500 mb-6">
            Estimated time: {content.duration_minutes} minutes
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <Button onClick={onComplete} size="lg" className="w-full">
              {content.type === 'story' ? 'Start Reading' : 
               content.type === 'game' ? 'Play Game' : 'Continue Learning'}
            </Button>
            <Button 
              onClick={onComplete} 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              Skip for now
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
