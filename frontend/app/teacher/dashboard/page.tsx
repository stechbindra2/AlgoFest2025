'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Users, 
  TrendingUp, 
  BookOpen, 
  Award,
  Calendar,
  Download,
  Eye,
  MoreVertical,
  Search,
  Filter,
  Plus
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/stat-card'
import { ClassroomCard } from '@/components/teacher/classroom-card'
import { StudentProgressTable } from '@/components/teacher/student-progress-table'
import { AnalyticsChart } from '@/components/teacher/analytics-chart'
import { CreateClassModal } from '@/components/teacher/create-class-modal'
import { apiClient } from '@/lib/api'

// Type definitions for teacher dashboard
interface Classroom {
  id: string
  name: string
  description: string
  class_code: string
  student_count?: number
  avg_progress?: number
  active_students?: number
}

interface TeacherAnalytics {
  overview: {
    totalStudents: number
    activeStudents: number
    avgProgress: number
    totalXPEarned: number
  }
  topicsMastered: number
  performanceData?: any[]
  topPerformers?: Array<{
    id: string
    name: string
    totalXP: number
  }>
  recentActivity?: Array<{
    description: string
    timestamp: string
  }>
}

export default function TeacherDashboardPage() {
  const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null)
  const [showCreateClass, setShowCreateClass] = useState(false)
  const [timeRange, setTimeRange] = useState('week')

  // Fetch teacher data with proper error handling
  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery({
    queryKey: ['teacher-classrooms'],
    queryFn: () => apiClient.getTeacherClassrooms(),
    retry: 1,
  })

  const { data: analytics = {}, isLoading: analyticsLoading } = useQuery({
    queryKey: ['teacher-analytics', selectedClassroom || undefined, timeRange],
    queryFn: () => apiClient.getTeacherAnalytics(selectedClassroom || undefined, timeRange),
    retry: 1,
  })

  const { data: studentProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['classroom-progress', selectedClassroom],
    queryFn: () => selectedClassroom ? apiClient.getClassroomProgress(selectedClassroom) : Promise.resolve([]),
    enabled: !!selectedClassroom,
    retry: 1,
  })

  // Safely access analytics data with defaults
  const safeAnalytics = analytics as TeacherAnalytics
  const overallStats = safeAnalytics.overview || {
    totalStudents: 0,
    activeStudents: 0,
    avgProgress: 0,
    totalXPEarned: 0,
  }

  // Mock data for demo purposes
  const mockClassrooms: Classroom[] = classrooms.length > 0 ? classrooms : [
    {
      id: '1',
      name: 'Grade 5A - Financial Literacy',
      description: 'Morning class focused on basic financial concepts',
      class_code: 'FIN5A2024',
      student_count: 25,
      avg_progress: 78,
      active_students: 23,
    },
    {
      id: '2',
      name: 'Grade 7B - Advanced Finance',
      description: 'Afternoon class covering investment basics',
      class_code: 'FIN7B2024',
      student_count: 22,
      avg_progress: 65,
      active_students: 20,
    },
  ]

  const mockAnalytics: TeacherAnalytics = {
    overview: {
      totalStudents: 47,
      activeStudents: 43,
      avgProgress: 72,
      totalXPEarned: 25800,
    },
    topicsMastered: 156,
    performanceData: [
      { week: 'Week 1', engagement: 85, completion: 78 },
      { week: 'Week 2', engagement: 88, completion: 82 },
      { week: 'Week 3', engagement: 82, completion: 80 },
      { week: 'Week 4', engagement: 90, completion: 85 },
    ],
    topPerformers: [
      { id: '1', name: 'Alice Johnson', totalXP: 2250 },
      { id: '2', name: 'Bob Smith', totalXP: 2100 },
      { id: '3', name: 'Carol Davis', totalXP: 1950 },
    ],
    recentActivity: [
      { description: 'Alice completed "Investment Basics" topic', timestamp: '2 hours ago' },
      { description: 'Bob earned "Streak Master" badge', timestamp: '3 hours ago' },
      { description: 'Carol reached Level 8', timestamp: '5 hours ago' },
    ],
  }

  // Use real data if available, otherwise use mock data
  const displayAnalytics = safeAnalytics.overview ? safeAnalytics : mockAnalytics
  const displayClassrooms = mockClassrooms
  const displayStats = displayAnalytics.overview

  if (classroomsLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-primary to-background-secondary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary to-background-secondary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-gray-800 mb-2">
              Teacher Dashboard 📚
            </h1>
            <p className="text-lg text-gray-600">
              Monitor your students' financial literacy journey
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" className="flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={() => setShowCreateClass(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Class
            </Button>
          </div>
        </motion.div>

        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Students"
            value={displayStats.totalStudents}
            color="blue"
            trend={`${displayStats.activeStudents} active today`}
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Avg Progress"
            value={Math.round(displayStats.avgProgress)}
            suffix="%"
            color="green"
            trend="+5% this week"
          />
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Topics Mastered"
            value={displayAnalytics.topicsMastered || 0}
            color="purple"
            trend="Across all classes"
          />
          <StatCard
            icon={<Award className="w-6 h-6" />}
            label="Total XP Earned"
            value={displayStats.totalXPEarned}
            color="yellow"
            trend="This month"
          />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Classrooms */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">My Classrooms</h2>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Filter className="w-4 h-4" />
                  </Button>
                  <select
                    value={selectedClassroom || ''}
                    onChange={(e) => setSelectedClassroom(e.target.value || null)}
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">All Classes</option>
                    {displayClassrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {displayClassrooms.map((classroom, index) => (
                  <ClassroomCard
                    key={classroom.id}
                    classroom={classroom}
                    isSelected={selectedClassroom === classroom.id}
                    onClick={() => setSelectedClassroom(classroom.id)}
                    delay={index * 0.1}
                  />
                ))}
              </div>
            </motion.div>

            {/* Student Progress */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Student Progress</h2>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {selectedClassroom ? (
                <StudentProgressTable 
                  students={Array.isArray(studentProgress) ? studentProgress : []}
                  classroomId={selectedClassroom}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a classroom to view student progress</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Time Range Selector */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h3 className="font-bold text-gray-800 mb-4">Time Range</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'quarter', label: 'Quarter' },
                  { value: 'year', label: 'Year' }
                ].map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setTimeRange(range.value)}
                    className={`p-2 text-sm rounded-lg transition-colors ${
                      timeRange === range.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Performance Analytics */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h3 className="font-bold text-gray-800 mb-4">Class Performance</h3>
              {displayAnalytics.performanceData ? (
                <AnalyticsChart data={displayAnalytics.performanceData} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </motion.div>

            {/* Top Performers */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Top Performers</h3>
                <Award className="w-5 h-5 text-yellow-500" />
              </div>
              
              <div className="space-y-3">
                {displayAnalytics.topPerformers && displayAnalytics.topPerformers.length > 0 ? (
                  displayAnalytics.topPerformers.slice(0, 5).map((student, index) => (
                    <div key={student.id} className="flex items-center space-x-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                        ${index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-primary-500'}
                      `}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.totalXP} XP</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No performance data yet
                  </p>
                )}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="card p-6"
            >
              <h3 className="font-bold text-gray-800 mb-4">Recent Activity</h3>
              
              <div className="space-y-3">
                {displayAnalytics.recentActivity && displayAnalytics.recentActivity.length > 0 ? (
                  displayAnalytics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{activity.description}</p>
                        <p className="text-xs text-gray-500">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateClass && (
        <CreateClassModal
          onClose={() => setShowCreateClass(false)}
          onSuccess={() => {
            setShowCreateClass(false)
            // Refresh classrooms data
          }}
        />
      )}
    </div>
  )
}
