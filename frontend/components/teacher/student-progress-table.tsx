'use client'

import { useState } from 'react'
import { Eye, TrendingUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'

interface StudentProgressTableProps {
  students: any[]
  classroomId: string
}

export function StudentProgressTable({ students }: StudentProgressTableProps) {
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'lastActive'>('progress')
  
  // Mock data if students array is empty
  const mockStudents = students.length > 0 ? students : [
    {
      id: '1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      total_xp: 1250,
      current_level: 5,
      progress: 78,
      last_active: '2024-01-15',
      topics_mastered: 4,
      current_streak: 7,
      at_risk: false,
    },
    {
      id: '2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      total_xp: 890,
      current_level: 3,
      progress: 45,
      last_active: '2024-01-12',
      topics_mastered: 2,
      current_streak: 2,
      at_risk: true,
    },
    {
      id: '3',
      name: 'Carol Davis',
      email: 'carol@example.com',
      total_xp: 1580,
      current_level: 7,
      progress: 92,
      last_active: '2024-01-15',
      topics_mastered: 6,
      current_streak: 12,
      at_risk: false,
    },
  ]

  const sortedStudents = [...mockStudents].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'progress':
        return b.progress - a.progress
      case 'lastActive':
        return new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
      default:
        return 0
    }
  })

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 flex space-x-2">
        <Button
          variant={sortBy === 'name' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('name')}
        >
          Name
        </Button>
        <Button
          variant={sortBy === 'progress' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('progress')}
        >
          Progress
        </Button>
        <Button
          variant={sortBy === 'lastActive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortBy('lastActive')}
        >
          Last Active
        </Button>
      </div>

      <div className="bg-white rounded-lg overflow-hidden shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level & XP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600">
                        {student.name.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-24">
                    <ProgressBar 
                      progress={student.progress} 
                      showLabel={false}
                      size="sm"
                    />
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {student.progress}% • {student.topics_mastered} topics
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    Level {student.current_level}
                  </div>
                  <div className="text-sm text-gray-500">
                    {student.total_xp} XP
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {student.at_risk ? (
                      <div className="flex items-center text-red-600">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span className="text-sm">At Risk</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="text-sm">On Track</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    🔥 {student.current_streak} day streak
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
