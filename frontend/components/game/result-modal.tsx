'use client'

import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Star, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ResultModalProps {
  isCorrect: boolean
  explanation: string
  xpEarned: number
  onNext: () => void
}

export function ResultModal({ 
  isCorrect, 
  explanation, 
  xpEarned, 
  onNext 
}: ResultModalProps) {
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
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-6"
          >
            {isCorrect ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            )}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`text-2xl font-bold mb-4 ${
              isCorrect ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {isCorrect ? 'Correct! 🎉' : 'Not quite right 🤔'}
          </motion.h2>

          {xpEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center space-x-2 mb-4 bg-yellow-50 rounded-lg p-3"
            >
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="font-bold text-yellow-700">+{xpEarned} XP</span>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-gray-700 mb-6 leading-relaxed"
          >
            {explanation}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button onClick={onNext} size="lg" className="w-full">
              Next Question
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
