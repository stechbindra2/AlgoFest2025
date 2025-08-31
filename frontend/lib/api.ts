import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

// Type definitions for API responses
interface UserProfile {
  id: string
  email: string
  role: string
  grade: number
  display_name: string
  user_profiles: {
    display_name: string
    avatar_url: string
    total_xp: number
    current_level: number
    current_streak: number
    longest_streak: number
    last_activity_date: string
    preferred_learning_style: string
    accessibility_settings: any
  }[]
}

interface GamificationStatus {
  level: number
  totalXP: number
  xpProgress: {
    current: number
    required: number
    progress: number
  }
  streak: {
    current: number
    longest: number
    last_activity: string
  }
  recentBadges: any[]
  stats: {
    current_streak: number
    longest_streak: number
    last_activity: string
  }
}

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

interface UserProgress {
  topics: {
    topic_id: string
    mastery_score: number
    attempts_count: number
    correct_answers: number
    time_spent_seconds: number
    last_attempt_at: string
    topics: Topic
  }[]
  statistics: {
    total_topics: number
    mastered_topics: number
    average_mastery: number
    completion_percentage: number
  }
}

// Teacher-related interfaces
interface Classroom {
  id: string
  name: string
  description: string
  class_code: string
  student_count: number
  avg_progress: number
  active_students: number
}

interface TeacherAnalytics {
  overview: {
    totalStudents: number
    activeStudents: number
    avgProgress: number
    totalXPEarned: number
  }
  topicsMastered: number
  performanceData: {
    week: string
    engagement: number
    completion: number
  }[]
  topPerformers: {
    id: string
    name: string
    totalXP: number
  }[]
  recentActivity: {
    description: string
    timestamp: string
  }[]
}

interface QuestionData {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'drag_drop' | 'scenario' | 'story_based'
  question_data: {
    type: string
    options?: string[]
    categories?: string[]
    items?: string[]
  }
  estimated_time_seconds: number
  difficulty_level: number
}

interface SubmitAnswerResponse {
  is_correct: boolean
  xp_earned: number
  explanation: string
  correct_answer: any
  feedback: string
  engagement_boost?: {
    type: 'story' | 'game' | 'celebration' | 'encouragement'
    content: string
    duration_minutes: number
  }
}

class ApiClient {
  private supabase = createClientComponentClient()
  private token: string | null = null

  constructor() {
    // Initialize token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('finquest_token')
    }
  }

  private async getAuthHeaders() {
    // Try to get token from localStorage first
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('finquest_token')
      if (storedToken && storedToken !== this.token) {
        this.token = storedToken
      }
    }

    // Try to get token from Supabase session
    const { data: { session } } = await this.supabase.auth.getSession()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Use stored token or session token
    const authToken = this.token || session?.access_token
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    return headers
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    try {
      const headers = await this.getAuthHeaders()
      const config: RequestInit = {
        headers,
        ...options,
      }

      const response = await fetch(url, config)
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized - clear token and redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('finquest_token')
            this.token = null
            
            // Only redirect if we're not already on auth pages
            if (!window.location.pathname.includes('/auth/')) {
              window.location.href = '/auth/login'
            }
          }
          throw new Error('Unauthorized')
        }
        
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json()
      }
      
      return await response.text() as unknown as T
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      
      // Return mock data for demo purposes when API fails
      return this.getMockData<T>(endpoint)
    }
  }

  // Enhanced mock data for offline demo capability
  private getMockData<T>(endpoint: string): T {
    const mockData: Record<string, any> = {
      '/users/profile': {
        id: 'demo-user-123',
        email: 'demo@student.com',
        role: 'student',
        grade: 5,
        display_name: 'Demo Student',
        user_profiles: [{
          display_name: 'Demo Student',
          avatar_url: null,
          total_xp: 1250,
          current_level: 6,
          current_streak: 5,
          longest_streak: 12,
          last_activity_date: new Date().toISOString().split('T')[0],
          preferred_learning_style: 'visual',
          accessibility_settings: {}
        }]
      },
      '/gamification/status': {
        level: 6,
        totalXP: 1250,
        xpProgress: {
          current: 150,
          required: 400,
          progress: 0.375
        },
        streak: {
          current: 5,
          longest: 12,
          last_activity: new Date().toISOString().split('T')[0]
        },
        recentBadges: [
          {
            badges: {
              name: 'Quick Learner',
              description: 'Answered 5 questions in under 20 seconds each',
              icon_url: '/badges/quick-learner.svg',
              rarity: 'rare',
              xp_reward: 100
            },
            earned_at: new Date().toISOString()
          }
        ],
        stats: {
          current_streak: 5,
          longest_streak: 12,
          last_activity: new Date().toISOString().split('T')[0]
        }
      },
      '/learning/progress': {
        topics: [
          {
            topic_id: 'topic-1',
            mastery_score: 0.85,
            attempts_count: 15,
            correct_answers: 13,
            time_spent_seconds: 450,
            last_attempt_at: new Date().toISOString(),
            topics: {
              id: 'topic-1',
              name: 'What is Money?',
              description: 'Understanding what money is and why we use it',
              sequence_order: 1,
              learning_objectives: ['Identify different types of money'],
              estimated_duration_minutes: 15,
              difficulty_base: 0.2,
              icon_name: 'coins',
              color_theme: 'blue',
              is_active: true
            }
          },
          {
            topic_id: 'topic-2',
            mastery_score: 0.65,
            attempts_count: 10,
            correct_answers: 7,
            time_spent_seconds: 320,
            last_attempt_at: new Date().toISOString(),
            topics: {
              id: 'topic-2',
              name: 'Saving Money',
              description: 'Why and how to save money',
              sequence_order: 2,
              learning_objectives: ['Understand importance of saving'],
              estimated_duration_minutes: 20,
              difficulty_base: 0.3,
              icon_name: 'piggy-bank',
              color_theme: 'green',
              is_active: true
            }
          }
        ],
        statistics: {
          total_topics: 5,
          mastered_topics: 1,
          average_mastery: 0.65,
          completion_percentage: 20
        }
      }
    }

    // Handle parameterized endpoints
    if (endpoint.includes('/learning/topics')) {
      return [
        {
          id: 'topic-1',
          name: 'What is Money?',
          description: 'Understanding what money is and why we use it',
          sequence_order: 1,
          learning_objectives: ['Identify different types of money'],
          estimated_duration_minutes: 15,
          difficulty_base: 0.2,
          icon_name: 'coins',
          color_theme: 'blue',
          is_active: true
        },
        {
          id: 'topic-2',
          name: 'Saving Money',
          description: 'Why and how to save money',
          sequence_order: 2,
          learning_objectives: ['Understand importance of saving'],
          estimated_duration_minutes: 20,
          difficulty_base: 0.3,
          icon_name: 'piggy-bank',
          color_theme: 'green',
          is_active: true
        },
        {
          id: 'topic-3',
          name: 'Needs vs Wants',
          description: 'Learning the difference between needs and wants',
          sequence_order: 3,
          learning_objectives: ['Distinguish between needs and wants'],
          estimated_duration_minutes: 25,
          difficulty_base: 0.4,
          icon_name: 'shopping-cart',
          color_theme: 'purple',
          is_active: true
        },
        {
          id: 'topic-4',
          name: 'Spending Wisely',
          description: 'How to make smart spending decisions',
          sequence_order: 4,
          learning_objectives: ['Make informed spending choices'],
          estimated_duration_minutes: 30,
          difficulty_base: 0.5,
          icon_name: 'calculator',
          color_theme: 'orange',
          is_active: true
        }
      ] as T
    }

    return mockData[endpoint] as T || {} as T
  }

  // Set token method for after login
  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('finquest_token', token)
    }
  }

  // Clear token method for logout
  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('finquest_token')
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token || (typeof window !== 'undefined' && !!localStorage.getItem('finquest_token'))
  }

  // Authentication
  async login(email: string, password: string) {
    try {
      const response = await this.request<{ access_token: string, user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      
      // Set token after successful login
      if (response && 'access_token' in response) {
        this.setToken(response.access_token)
      }
      
      return response
    } catch (error) {
      console.warn('Login API failed, using demo mode')
      // Return mock response for demo
      const mockResponse = {
        access_token: 'demo_token_' + Date.now(),
        user: {
          id: 'demo-user-123',
          email: email,
          role: email.includes('teacher') ? 'teacher' : 'student',
          grade: email.includes('teacher') ? null : 5,
          display_name: email.includes('teacher') ? 'Demo Teacher' : 'Demo Student',
        }
      }
      
      this.setToken(mockResponse.access_token)
      return mockResponse
    }
  }

  async register(userData: {
    email: string
    password: string
    display_name?: string
    grade?: number
    role?: string
  }) {
    try {
      const response = await this.request<{ access_token: string, user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      })
      
      // Set token after successful registration
      if (response.access_token) {
        this.setToken(response.access_token)
      }
      
      return response
    } catch (error) {
      console.warn('Register API failed, using demo mode')
      // Return mock response for demo
      const mockResponse = {
        access_token: 'demo_token_' + Date.now(),
        user: {
          id: 'demo-user-' + Date.now(),
          email: userData.email,
          role: userData.role || 'student',
          grade: userData.grade || 5,
          display_name: userData.display_name || 'Demo User',
        }
      }
      
      this.setToken(mockResponse.access_token)
      return mockResponse
    }
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } catch (error) {
      console.warn('Logout API failed, clearing local session')
    } finally {
      this.clearToken()
      // Clear any cached user data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_data')
        sessionStorage.clear()
      }
    }
    
    return { message: 'Logged out successfully' }
  }

  // User Profile
  async getUserProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/users/profile')
  }

  // Gamification
  async getGamificationStatus(): Promise<GamificationStatus> {
    return this.request<GamificationStatus>('/gamification/status')
  }

  async getUserBadges() {
    return this.request('/gamification/badges')
  }

  async getLeaderboard(type = 'global', limit = 50) {
    return this.request(`/gamification/leaderboard?type=${type}&limit=${limit}`)
  }

  // Learning
  async getNextQuestion(topicId: string): Promise<QuestionData> {
    try {
      return this.request<QuestionData>(`/learning/questions/next/${topicId}`)
    } catch (error) {
      // Return mock question for demo
      return {
        id: 'demo-question-1',
        question_text: 'What is the smartest thing to do with money you receive as a gift?',
        question_type: 'multiple_choice',
        question_data: {
          type: 'multiple_choice',
          options: [
            'Save some and spend some wisely',
            'Spend it all immediately',
            'Give it all away',
            'Hide it under your bed'
          ],
        },
        estimated_time_seconds: 30,
        difficulty_level: 0.4,
      }
    }
  }

  async submitAnswer(questionId: string, answerData: any): Promise<SubmitAnswerResponse> {
    try {
      return this.request<SubmitAnswerResponse>(`/learning/questions/${questionId}/submit`, {
        method: 'POST',
        body: JSON.stringify(answerData),
      })
    } catch (error) {
      // Return mock response for demo
      const isCorrect = Math.random() > 0.3 // 70% chance of being correct for demo
      return {
        is_correct: isCorrect,
        xp_earned: isCorrect ? Math.floor(Math.random() * 50) + 25 : 10,
        explanation: isCorrect 
          ? 'Excellent! Balancing saving and spending helps you enjoy money now while planning for the future.'
          : 'Not quite right. It\'s usually best to save some money for the future while also enjoying some now.',
        correct_answer: 'Save some and spend some wisely',
        feedback: isCorrect ? 'Great job! 🎉' : 'Keep trying! 💪',
        ...(Math.random() > 0.8 && {
          engagement_boost: {
            type: 'celebration' as const,
            content: 'Amazing work! You\'re becoming a money master! 🌟',
            duration_minutes: 2,
          }
        }),
      }
    }
  }

  async getTopics(grade?: number): Promise<Topic[]> {
    const params = grade ? `?grade=${grade}` : ''
    return this.request<Topic[]>(`/learning/topics${params}`)
  }

  async getUserProgress(): Promise<UserProgress> {
    return this.request<UserProgress>('/learning/progress')
  }

  // Analytics
  async getMasteryInsights(topicId: string) {
    return this.request(`/adaptive/mastery/${topicId}/insights`)
  }

  async getLearningAnalytics() {
    return this.request('/analytics/learning')
  }

  // Teacher endpoints
  async getTeacherClassrooms(): Promise<Classroom[]> {
    try {
      return this.request<Classroom[]>('/teacher/classrooms')
    } catch (error) {
      // Return mock data for demo
      return [
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
    }
  }

  async getTeacherAnalytics(classroomId?: string, timeRange?: string): Promise<TeacherAnalytics> {
    try {
      const params = new URLSearchParams()
      if (classroomId) params.append('classroomId', classroomId)
      if (timeRange) params.append('timeRange', timeRange)
      
      return this.request<TeacherAnalytics>(`/teacher/analytics?${params.toString()}`)
    } catch (error) {
      // Return mock data for demo
      return {
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
    }
  }

  async getClassroomProgress(classroomId: string): Promise<any[]> {
    try {
      return this.request<any[]>(`/teacher/classrooms/${classroomId}/progress`)
    } catch (error) {
      // Return empty array for demo
      return []
    }
  }

  async startTopic(topicId: string) {
    try {
      return this.request(`/learning/topics/${topicId}/start`)
    } catch (error) {
      console.warn('Start topic API failed, using demo mode')
      // Return mock response for demo
      return {
        session: {
          id: 'demo-session-' + Date.now(),
          started_at: new Date().toISOString(),
        },
        first_question: {
          id: 'demo-question-' + Date.now(),
          topic_id: topicId,
          question_text: 'What is the best way to save money?',
          question_type: 'multiple_choice',
          question_data: {
            type: 'multiple_choice',
            options: [
              'Put it in a piggy bank',
              'Keep it under your pillow',
              'Give it to your parents',
              'Spend it right away'
            ],
            correct_answer: 'Put it in a piggy bank'
          },
          difficulty_level: 0.3,
          estimated_time_seconds: 30
        },
        topic_info: {
          id: topicId,
          name: 'Financial Basics',
          description: 'Learn about money and saving'
        }
      }
    }
  }
}

export const apiClient = new ApiClient()
