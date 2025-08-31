'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Lightbulb, Star, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuestionData {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'drag_drop' | 'scenario' | 'story_based'
  question_data: {
    type: string
    options?: string[]
    categories?: string[]
    items?: string[]
    correct_answer?: string
  }
  estimated_time_seconds: number
  difficulty_level: number
}

interface QuestionCardProps {
  question: QuestionData
  onAnswer: (answer: any) => void
  onHint?: () => void
  className?: string
}

export function QuestionCard({ question, onAnswer, onHint, className }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(question.estimated_time_seconds)
  const [showHint, setShowHint] = useState(false)
  const [isAnswered, setIsAnswered] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime])

  const handleAnswerSelect = (answer: any) => {
    if (isAnswered) return
    setSelectedAnswer(answer)
  }

  const handleSubmit = () => {
    if (!selectedAnswer || isAnswered) return
    
    setIsAnswered(true)
    const timeTaken = question.estimated_time_seconds - timeLeft
    
    onAnswer({
      answer: selectedAnswer,
      time_taken_seconds: timeTaken,
      hint_used: showHint,
      confidence_rating: Math.ceil(Math.random() * 5), // Could be actual user input
    })
  }

  const handleHintClick = () => {
    setShowHint(true)
    onHint?.()
  }

  const getDifficultyColor = (level: number) => {
    if (level <= 0.3) return 'text-green-600 bg-green-100'
    if (level <= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getDifficultyLabel = (level: number) => {
    if (level <= 0.3) return 'Easy'
    if (level <= 0.6) return 'Medium'
    return 'Hard'
  }

  const renderQuestion = () => {
    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.question_data.options?.map((option, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'answer-option',
                  selectedAnswer === option && 'answer-option-selected'
                )}
                onClick={() => handleAnswerSelect(option)}
                disabled={isAnswered}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold',
                    selectedAnswer === option 
                      ? 'bg-primary-500 border-primary-500 text-white' 
                      : 'border-gray-300'
                  )}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-left">{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )

      case 'drag_drop':
        return <DragDropQuestion questionData={question.question_data} onAnswer={handleAnswerSelect} />

      default:
        return (
          <div className="space-y-3">
            {question.question_data.options?.map((option, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  'answer-option',
                  selectedAnswer === option && 'answer-option-selected'
                )}
                onClick={() => handleAnswerSelect(option)}
                disabled={isAnswered}
              >
                {option}
              </motion.button>
            ))}
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn('question-card max-w-2xl mx-auto', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            getDifficultyColor(question.difficulty_level)
          )}>
            {getDifficultyLabel(question.difficulty_level)}
          </div>
          <div className="flex items-center space-x-1 text-gray-600">
            <Star className="w-4 h-4" />
            <span className="text-sm">
              {Math.ceil(question.difficulty_level * 100)} XP
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHintClick}
            disabled={showHint || isAnswered}
            className="flex items-center space-x-1"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Hint</span>
          </Button>
          
          <div className={cn(
            'flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium',
            timeLeft <= 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600'
          )}>
            <Clock className="w-4 h-4" />
            <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 leading-relaxed">
          {question.question_text}
        </h2>
        
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4"
            >
              <div className="flex items-center space-x-2 text-yellow-700">
                <Lightbulb className="w-5 h-5" />
                <span className="font-medium">Hint:</span>
              </div>
              <p className="text-yellow-600 mt-1">
                Think about what would be the smartest choice for managing money!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Answer Options */}
      <div className="mb-6">
        {renderQuestion()}
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={!selectedAnswer || isAnswered}
          size="lg"
          className="px-8"
        >
          {isAnswered ? (
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Submitted!</span>
            </div>
          ) : (
            'Submit Answer'
          )}
        </Button>
      </div>
    </motion.div>
  )
}

// Simple drag-drop component for demonstration
function DragDropQuestion({ questionData, onAnswer }: any) {
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})

  const handleDrop = (item: string, category: string) => {
    setAssignments(prev => {
      const newAssignments = { ...prev }
      
      // Remove item from all categories
      Object.keys(newAssignments).forEach(cat => {
        newAssignments[cat] = newAssignments[cat]?.filter(i => i !== item) || []
      })
      
      // Add to target category
      newAssignments[category] = [...(newAssignments[category] || []), item]
      
      return newAssignments
    })
    
    onAnswer(assignments)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {questionData.categories?.map((category: string) => (
        <div key={category} className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-32">
          <h4 className="font-semibold mb-3 text-center">{category}</h4>
          <div className="space-y-2">
            {assignments[category]?.map((item: string) => (
              <div key={item} className="bg-primary-100 px-3 py-2 rounded text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <div className="md:col-span-2">
        <h4 className="font-semibold mb-3">Items to Sort:</h4>
        <div className="flex flex-wrap gap-2">
          {questionData.items?.filter((item: string) => 
            !Object.values(assignments).flat().includes(item)
          ).map((item: string) => (
            <button
              key={item}
              className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded text-sm transition-colors"
              onClick={() => handleDrop(item, questionData.categories[0])}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
