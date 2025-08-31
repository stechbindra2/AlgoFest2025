'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, Star, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  const [statsAnimated, setStatsAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStatsAnimated(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const stats = [
    { label: 'Students Learning', value: 5000, suffix: '+', icon: Users },
    { label: 'Success Rate', value: 85, suffix: '%', icon: TrendingUp },
    { label: 'Teacher Rating', value: 4.9, suffix: '/5', icon: Star },
  ]

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-primary-50 via-background-secondary to-primary-100">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-20 left-10 w-20 h-20 bg-yellow-300 rounded-full opacity-20"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-40 right-20 w-16 h-16 bg-blue-400 rounded-full opacity-20"
        />
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-20 left-1/4 w-12 h-12 bg-green-400 rounded-full opacity-20"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Star className="w-4 h-4 mr-2" />
              #1 AI-Powered Financial Education Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-5xl lg:text-6xl font-display font-bold text-gray-800 mb-6 leading-tight"
            >
              Learn Money Skills
              <span className="text-primary-500"> Through Adventure!</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-xl text-gray-600 mb-8 max-w-xl"
            >
              AI-powered gamified learning platform that adapts to your child's pace. 
              Make financial literacy fun with quizzes, stories, and rewards!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 mb-12"
            >
              <Button asChild size="xl" className="flex-1 sm:flex-initial">
                <Link href="/auth/register">
                  Start Learning Free
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="ml-2"
                  >
                    →
                  </motion.div>
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="xl" className="flex-1 sm:flex-initial">
                <Link href="/demo" className="flex items-center">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Link>
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="grid grid-cols-3 gap-6"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ scale: 0 }}
                  animate={{ scale: statsAnimated ? 1 : 0 }}
                  transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center mb-2">
                    <stat.icon className="w-5 h-5 text-primary-500 mr-1" />
                    <motion.span
                      className="text-2xl lg:text-3xl font-bold text-gray-800"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.4 + index * 0.1 }}
                    >
                      {statsAnimated ? (
                        <CountUpNumber 
                          end={stat.value} 
                          suffix={stat.suffix}
                          duration={1000}
                        />
                      ) : (
                        '0'
                      )}
                    </motion.span>
                  </div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Image/Animation */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10">
              {/* Main Character */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-full max-w-md mx-auto"
              >
                <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-primary-200">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Level 5 Achieved!</h3>
                    <p className="text-gray-600 mb-4">You've mastered budgeting basics!</p>
                    
                    {/* XP Bar */}
                    <div className="bg-gray-200 rounded-full h-3 mb-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '75%' }}
                        transition={{ delay: 1.5, duration: 1.5 }}
                        className="bg-gradient-to-r from-primary-400 to-primary-600 h-full rounded-full"
                      />
                    </div>
                    
                    {/* Badges */}
                    <div className="flex justify-center space-x-2">
                      {['🌟', '💰', '🎯'].map((badge, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, rotate: 180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 2 + i * 0.2, duration: 0.5 }}
                          className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-lg"
                        >
                          {badge}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Elements */}
              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
                className="absolute -top-6 -left-6 bg-yellow-400 rounded-full w-16 h-16 flex items-center justify-center text-2xl shadow-lg"
              >
                💡
              </motion.div>

              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, -10, 0],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
                className="absolute -top-4 -right-8 bg-green-400 rounded-full w-12 h-12 flex items-center justify-center text-xl shadow-lg"
              >
                💸
              </motion.div>

              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 15, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.5
                }}
                className="absolute -bottom-4 -left-8 bg-blue-400 rounded-full w-14 h-14 flex items-center justify-center text-xl shadow-lg"
              >
                📊
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// Helper component for animated numbers
function CountUpNumber({ end, suffix = '', duration = 1000 }: { 
  end: number; 
  suffix?: string; 
  duration?: number 
}) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      setCurrent(prev => {
        const next = prev + increment
        if (next >= end) {
          clearInterval(timer)
          return end
        }
        return next
      })
    }, 16)

    return () => clearInterval(timer)
  }, [end, duration])

  return <>{Math.floor(current)}{suffix}</>
}
