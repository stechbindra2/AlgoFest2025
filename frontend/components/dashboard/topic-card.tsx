'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Play, CheckCircle, Lock, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'

interface Topic {
  id: string
  name: string
  description: string
  sequence_order: number
  learning_objectives: string[]
  estimated_duration_minutes: number
  difficulty_base: number
  icon_name: string
  color_theme: string
  is_active: boolean
}

interface TopicProgress {
  topic_id: string
  mastery_score: number
  attempts_count: number
  correct_answers: number
  time_spent_seconds: number
  last_attempt_at: string
  topics: Topic
}

interface TopicCardProps {
  topic: Topic
  progress?: TopicProgress
  delay?: number
}

export function TopicCard({ topic, progress, delay = 0 }: TopicCardProps) {
  const router = useRouter()
  
  const masteryScore = progress?.mastery_score || 0
  const progressPercentage = Math.round(masteryScore * 100)
  const isMastered = masteryScore >= 0.8
  const isStarted = (progress?.attempts_count || 0) > 0
  
  // Topic status logic
  const getTopicStatus = () => {
    if (!topic.is_active) return 'locked'
    if (isMastered) return 'mastered'
    if (isStarted) return 'in_progress'
    return 'available'
  }

  const status = getTopicStatus()

  // Icon mapping
  const getTopicIcon = (iconName: string) => {
    const iconMap: Record<string, string> = {
      'coins': '🪙',
      'piggy-bank': '🐷',
      'shopping-cart': '🛒',
      'calculator': '🧮',
      'bank': '🏦',
      'chart': '📊',
      'money': '💰',
      'investment': '📈',
      'planning': '📋',
      'goals': '🎯',
    }
    return iconMap[iconName] || '📚'
  }

  // Color theme mapping
  const getColorClasses = (colorTheme: string, status: string) => {
    const baseClasses = {
      blue: 'from-blue-400 to-blue-600',
      green: 'from-green-400 to-green-600',
      purple: 'from-purple-400 to-purple-600',
      orange: 'from-orange-400 to-orange-600',
      red: 'from-red-400 to-red-600',
      yellow: 'from-yellow-400 to-yellow-600',
    }

    const statusClasses = {
      mastered: 'border-green-200 bg-green-50',
      in_progress: 'border-primary-200 bg-primary-50',
      available: 'border-gray-200 bg-white',
      locked: 'border-gray-200 bg-gray-50',
    }

    return {
      gradient: baseClasses[colorTheme as keyof typeof baseClasses] || baseClasses.blue,
      background: statusClasses[status as keyof typeof statusClasses] || statusClasses.available,
    }
  }

  const handleStartTopic = () => {
    console.log('Starting topic:', topic.id)
    router.push(`/quiz/${topic.id}`)
  }

  const colors = getColorClasses(topic.color_theme, status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`card-interactive p-6 border-2 transition-all duration-300 ${colors.background}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white text-2xl shadow-lg`}>
            {getTopicIcon(topic.icon_name)}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-lg leading-tight">
              {topic.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {topic.description}
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center">
          {status === 'mastered' && (
            <CheckCircle className="w-6 h-6 text-green-500" />
          )}
          {status === 'locked' && (
            <Lock className="w-6 h-6 text-gray-400" />
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status !== 'locked' && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Progress</span>
            <span className="text-sm font-bold text-gray-800">
              {progressPercentage}%
            </span>
          </div>
          <ProgressBar 
            progress={progressPercentage} 
            className="h-2"
            color={status === 'mastered' ? 'green' : 'primary'}
          />
        </div>
      )}

      {/* Stats */}
      {isStarted && (
        <div className="grid grid-cols-2 gap-4 mb-4 text-center">
          <div className="bg-white/50 rounded-lg p-2">
            <div className="text-lg font-bold text-gray-800">
              {progress?.attempts_count || 0}
            </div>
            <div className="text-xs text-gray-600">Questions</div>
          </div>
          <div className="bg-white/50 rounded-lg p-2">
            <div className="text-lg font-bold text-gray-800">
              {Math.round((progress?.time_spent_seconds || 0) / 60)}
            </div>
            <div className="text-xs text-gray-600">Minutes</div>
          </div>
        </div>
      )}

      {/* Learning Objectives */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          You'll Learn:
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          {topic.learning_objectives?.slice(0, 2).map((objective, index) => (
            <li key={index} className="flex items-start space-x-1">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>{objective}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-500">
          <Clock className="w-3 h-3 mr-1" />
          <span>{topic.estimated_duration_minutes} min</span>
        </div>

        <Button
          onClick={handleStartTopic}
          disabled={status === 'locked'}
          size="sm"
          className="flex items-center space-x-1"
          variant={status === 'mastered' ? 'outline' : 'default'}
        >
          <Play className="w-3 h-3" />
          <span>
            {status === 'mastered' ? 'Review' : 
             status === 'in_progress' ? 'Continue' : 
             'Start'}
          </span>
        </Button>
      </div>
    </motion.div>
  )
}
