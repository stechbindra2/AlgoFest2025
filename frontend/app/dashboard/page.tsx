'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { 
  BookOpen, 
  Trophy, 
  Zap, 
  Target, 
  TrendingUp, 
  Calendar,
  Star,
  Play,
  Award,
  ChevronRight
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import { StatCard } from '@/components/dashboard/stat-card'
import { TopicCard } from '@/components/dashboard/topic-card'
import { AchievementCard } from '@/components/dashboard/achievement-card'
import { StreakTracker } from '@/components/dashboard/streak-tracker'
import { DashboardHeader } from '@/components/dashboard/header'
import { apiClient } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const [greeting, setGreeting] = useState('')

  // Fetch user data with proper error handling and defaults
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.getUserProfile(),
    retry: 1,
    enabled: apiClient.isAuthenticated(), // Only fetch if authenticated
  })

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['user-progress'],
    queryFn: () => apiClient.getUserProgress(),
    retry: 1,
    enabled: apiClient.isAuthenticated(),
  })

  const { data: gamification, isLoading: gamificationLoading } = useQuery({
    queryKey: ['gamification-status'],
    queryFn: () => apiClient.getGamificationStatus(),
    retry: 1,
    enabled: apiClient.isAuthenticated(),
  })

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['topics', profile?.grade || 5],
    queryFn: () => apiClient.getTopics(profile?.grade || 5),
    enabled: !!profile?.grade || !apiClient.isAuthenticated(), // Fetch topics even in demo mode
    retry: 1,
  })

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Show loading state
  if (profileLoading || progressLoading || gamificationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-primary to-background-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Safe data access with defaults
  const userProfile = profile || {
    display_name: 'Student',
    grade: 5,
    user_profiles: [{
      display_name: 'Student',
      total_xp: 0,
      current_level: 1,
      current_streak: 0,
      longest_streak: 0
    }]
  }

  const userProgress = progress || {
    topics: [],
    statistics: {
      total_topics: 0,
      mastered_topics: 0,
      average_mastery: 0,
      completion_percentage: 0
    }
  }

  const userGamification = gamification || {
    level: 1,
    totalXP: 0,
    xpProgress: { current: 0, required: 100, progress: 0 },
    streak: { current: 0, longest: 0, last_activity: null },
    recentBadges: [],
    stats: { current_streak: 0, longest_streak: 0, last_activity: null }
  }

  const userTopics = topics || []

  // Find next topic to work on
  const nextTopic = userTopics.find((topic) => {
    const topicProgress = userProgress.topics.find(p => p.topic_id === topic.id)
    return !topicProgress || topicProgress.mastery_score < 0.8
  })

  const handleContinueLearning = () => {
    if (nextTopic) {
      console.log('Navigating to quiz for topic:', nextTopic.id)
      router.push(`/quiz/${nextTopic.id}`)
    } else {
      console.log('No next topic found, showing all topics')
      // Could navigate to topics overview or show completion message
    }
  }

  const displayName = userProfile.user_profiles?.[0]?.display_name || 
                     userProfile.display_name || 
                     'Student'

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary to-background-secondary">
      {/* Add Header */}
      <DashboardHeader 
        user={userProfile.user_profiles?.[0] || {
          display_name: displayName,
          total_xp: userGamification.totalXP,
          current_level: userGamification.level,
        }} 
      />

      <div className="container mx-auto px-4 py-8">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-gray-800 mb-2">
            {greeting}, {displayName}! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Ready to continue your financial adventure?
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={<Zap className="w-6 h-6" />}
            label="Level"
            value={userGamification.level}
            color="yellow"
            trend="+1 this week"
          />
          <StatCard
            icon={<Star className="w-6 h-6" />}
            label="Total XP"
            value={userGamification.totalXP}
            color="purple"
            trend={`+${Math.floor(Math.random() * 100)} today`}
          />
          <StatCard
            icon={<Trophy className="w-6 h-6" />}
            label="Streak"
            value={userGamification.streak.current}
            suffix=" days"
            color="orange"
            trend="Keep it up!"
          />
          <StatCard
            icon={<Target className="w-6 h-6" />}
            label="Mastery"
            value={Math.round(userProgress.statistics.completion_percentage)}
            suffix="%"
            color="green"
            trend="Great progress!"
          />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Continue Learning */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Continue Learning</h2>
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {nextTopic ? (
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        {nextTopic.name}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {nextTopic.description}
                      </p>
                      
                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>
                            {Math.round((userProgress.topics.find(p => p.topic_id === nextTopic.id)?.mastery_score || 0) * 100)}%
                          </span>
                        </div>
                        <ProgressBar 
                          progress={(userProgress.topics.find(p => p.topic_id === nextTopic.id)?.mastery_score || 0) * 100}
                          className="h-2"
                        />
                      </div>

                      <Button 
                        className="flex items-center"
                        onClick={handleContinueLearning}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Continue Learning
                      </Button>
                    </div>
                    
                    <div className="text-6xl ml-6">
                      {nextTopic.icon_name === 'coins' ? '🪙' : 
                       nextTopic.icon_name === 'piggy-bank' ? '🐷' : 
                       nextTopic.icon_name === 'calculator' ? '🧮' : '📚'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Congratulations!
                  </h3>
                  <p className="text-gray-600">
                    You've mastered all available topics for your grade level!
                  </p>
                </div>
              )}
            </motion.div>

            {/* Topics Grid */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-6">Your Topics</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {userTopics.slice(0, 6).map((topic, index) => {
                  const topicProgress = userProgress.topics.find(p => p.topic_id === topic.id)
                  return (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      progress={topicProgress}
                      delay={index * 0.1}
                    />
                  )
                })}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Level Progress */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">⭐</div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  Level {userGamification.level}
                </h3>
                <p className="text-sm text-gray-600 mb-4">Finance Explorer</p>
                
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>XP Progress</span>
                    <span>
                      {userGamification.xpProgress.current} / {userGamification.xpProgress.required}
                    </span>
                  </div>
                  <ProgressBar 
                    progress={userGamification.xpProgress.progress * 100}
                    className="h-3"
                  />
                </div>
                
                <p className="text-xs text-gray-500">
                  {userGamification.xpProgress.required - userGamification.xpProgress.current} XP to next level
                </p>
              </div>
            </motion.div>

            {/* Streak Tracker */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <StreakTracker streak={userGamification.streak.last_activity ? userGamification.streak : undefined} />
            </motion.div>

            {/* Recent Achievements */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Recent Badges</h3>
                <Button variant="ghost" size="sm">
                  <Award className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                {userGamification.recentBadges && userGamification.recentBadges.length > 0 ? (
                  userGamification.recentBadges.slice(0, 3).map((badge, index) => (
                    <AchievementCard 
                      key={index}
                      badge={badge}
                      delay={index * 0.1}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No badges yet. Keep learning to earn your first badge!
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
