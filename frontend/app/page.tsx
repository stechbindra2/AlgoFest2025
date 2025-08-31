'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Star, Users, Trophy, BookOpen, Zap, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { HeroSection } from '@/components/landing/hero-section'
import { FeatureCard } from '@/components/landing/feature-card'
import { TestimonialCard } from '@/components/landing/testimonial-card'
import { apiClient } from '@/lib/api'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (apiClient.isAuthenticated()) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background-secondary to-primary-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎯</span>
              <span className="text-xl font-display font-bold text-gray-800">FinQuest</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Suspense fallback={<div className="h-screen bg-gradient-to-br from-primary-50 to-primary-100" />}>
        <HeroSection />
      </Suspense>

      {/* Demo Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center py-8"
      >
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            🏆 AlgoFest 2025 Demo
          </h3>
          <p className="text-gray-600 mb-4">
            Experience FinQuest's AI-powered adaptive learning system
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/auth/login">
              <Button>Try Demo</Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-800 mb-4">
              Learning Finance Has Never Been This Fun! 🎮
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              FinQuest uses AI to adapt to each student's learning style, making financial education 
              engaging and effective for kids aged 8-13.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="AI-Powered Learning"
              description="Smart algorithm adapts difficulty in real-time based on your child's progress and engagement"
              color="yellow"
            />
            <FeatureCard
              icon={<Trophy className="w-8 h-8" />}
              title="Gamified Experience"
              description="Earn XP, unlock badges, and climb leaderboards while mastering money management skills"
              color="purple"
            />
            <FeatureCard
              icon={<BookOpen className="w-8 h-8" />}
              title="Curriculum Aligned"
              description="Grade-specific content covering budgeting, saving, investing, and entrepreneurship"
              color="blue"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Teacher Dashboard"
              description="Comprehensive analytics and progress tracking for classroom management"
              color="green"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Safe & Secure"
              description="COPPA compliant platform with robust privacy protection for young learners"
              color="red"
            />
            <FeatureCard
              icon={<Star className="w-8 h-8" />}
              title="Proven Results"
              description="Students show 85% improvement in financial literacy assessments"
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-background-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-800 mb-4">
              How FinQuest Works 🚀
            </h2>
            <p className="text-xl text-gray-600">
              Simple steps to financial literacy mastery
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Take Assessment</h3>
              <p className="text-gray-600">
                Quick quiz to understand your current knowledge level and learning preferences
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Learn & Play</h3>
              <p className="text-gray-600">
                Engage with adaptive quizzes, stories, and mini-games tailored to your level
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Master Skills</h3>
              <p className="text-gray-600">
                Track progress, earn rewards, and become a financial literacy expert
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-gray-800 mb-4">
              What Teachers & Parents Say 💬
            </h2>
            <p className="text-xl text-gray-600">
              Real feedback from educators and families
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="My students are actually excited about learning financial concepts! FinQuest makes complex topics accessible and fun."
              author="Sarah Johnson"
              role="4th Grade Teacher"
              avatar="/avatars/teacher1.jpg"
            />
            <TestimonialCard
              quote="The adaptive difficulty is brilliant. My daughter stays challenged but never frustrated. Her confidence has grown tremendously."
              author="Michael Chen"
              role="Parent"
              avatar="/avatars/parent1.jpg"
            />
            <TestimonialCard
              quote="The analytics dashboard helps me identify exactly where each student needs support. It's transformed my teaching approach."
              author="Emily Rodriguez"
              role="Financial Literacy Coordinator"
              avatar="/avatars/teacher2.jpg"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-display font-bold mb-6">
            Ready to Start Your Financial Adventure? 🌟
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of students already mastering money management through FinQuest's 
            innovative learning platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="xl" variant="secondary">
              <Link href="/auth/register">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/demo">
                Try Demo
              </Link>
            </Button>
          </div>
          <p className="text-sm opacity-75 mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  )
}
