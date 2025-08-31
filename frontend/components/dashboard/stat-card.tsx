'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number | string
  suffix?: string
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange'
  trend?: string
  delay?: number
}

const colorClasses = {
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  purple: 'text-purple-600 bg-purple-100',
  yellow: 'text-yellow-600 bg-yellow-100',
  red: 'text-red-600 bg-red-100',
  orange: 'text-orange-600 bg-orange-100',
}

export function StatCard({ 
  icon, 
  label, 
  value, 
  suffix = '', 
  color, 
  trend, 
  delay = 0 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-800">
          {value}{suffix}
        </p>
        <p className="text-sm text-gray-600">{label}</p>
        {trend && (
          <p className="text-xs text-gray-500">{trend}</p>
        )}
      </div>
    </motion.div>
  )
}
