'use client'

import { motion } from 'framer-motion'
import { Users, TrendingUp, BookOpen } from 'lucide-react'

interface ClassroomCardProps {
  classroom: {
    id: string
    name: string
    description: string
    class_code: string
    student_count?: number
    avg_progress?: number
    active_students?: number
  }
  isSelected: boolean
  onClick: () => void
  delay?: number
}

export function ClassroomCard({ 
  classroom, 
  isSelected, 
  onClick, 
  delay = 0 
}: ClassroomCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      onClick={onClick}
      className={`
        p-6 rounded-xl border-2 cursor-pointer transition-all duration-300
        ${isSelected 
          ? 'border-primary-500 bg-primary-50 shadow-lg' 
          : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 mb-1">{classroom.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{classroom.description}</p>
          <p className="text-xs text-gray-500">Code: {classroom.class_code}</p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-primary-600">
            {classroom.student_count || 0}
          </div>
          <p className="text-xs text-gray-500">Students</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-sm font-medium text-gray-800">
            {classroom.active_students || 0}
          </p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-sm font-medium text-gray-800">
            {Math.round(classroom.avg_progress || 0)}%
          </p>
          <p className="text-xs text-gray-500">Progress</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <BookOpen className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-sm font-medium text-gray-800">
            {Math.floor(Math.random() * 5) + 3}
          </p>
          <p className="text-xs text-gray-500">Topics</p>
        </div>
      </div>
    </motion.div>
  )
}
