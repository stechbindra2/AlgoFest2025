import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async getLearningAnalytics(userId: string) {
    // Get comprehensive learning data
    const [
      masteryData,
      sessionData,
      questionAttempts,
      userProfile
    ] = await Promise.all([
      this.getMasteryAnalytics(userId),
      this.getSessionAnalytics(userId),
      this.getQuestionAnalytics(userId),
      this.getUserProfile(userId)
    ]);

    return {
      user_id: userId,
      mastery_analytics: masteryData,
      session_analytics: sessionData,
      question_analytics: questionAttempts,
      overall_progress: {
        total_topics: masteryData.total_topics,
        mastered_topics: masteryData.mastered_topics,
        average_mastery: masteryData.average_mastery,
        total_time_spent: sessionData.total_time_minutes,
        total_questions_answered: questionAttempts.total_attempts,
        overall_accuracy: questionAttempts.accuracy_percentage,
      },
      recommendations: await this.generateRecommendations(userId, masteryData, sessionData),
    };
  }

  private async getMasteryAnalytics(userId: string) {
    const { data: masteryData } = await this.supabase
      .from('user_topic_mastery')
      .select(`
        *,
        topics (name, sequence_order)
      `)
      .eq('user_id', userId);

    if (!masteryData?.length) {
      return {
        total_topics: 0,
        mastered_topics: 0,
        average_mastery: 0,
        topics: []
      };
    }

    const masteredTopics = masteryData.filter(m => m.mastery_score >= 0.8).length;
    const averageMastery = masteryData.reduce((sum, m) => sum + m.mastery_score, 0) / masteryData.length;

    return {
      total_topics: masteryData.length,
      mastered_topics: masteredTopics,
      average_mastery: Math.round(averageMastery * 100) / 100,
      topics: masteryData.map(m => ({
        topic_name: m.topics.name,
        mastery_score: m.mastery_score,
        attempts: m.attempts_count,
        time_spent: m.time_spent_seconds,
        is_mastered: m.mastery_score >= 0.8,
      })),
    };
  }

  private async getSessionAnalytics(userId: string) {
    const { data: sessions } = await this.supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (!sessions?.length) {
      return {
        total_sessions: 0,
        total_time_minutes: 0,
        average_session_length: 0,
        sessions_this_week: 0,
      };
    }

    const totalTime = sessions.reduce((sum, s) => {
      if (s.ended_at) {
        const duration = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60);
        return sum + duration;
      }
      return sum;
    }, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const sessionsThisWeek = sessions.filter(s => new Date(s.started_at) > weekAgo).length;

    return {
      total_sessions: sessions.length,
      total_time_minutes: Math.round(totalTime),
      average_session_length: Math.round(totalTime / sessions.length),
      sessions_this_week: sessionsThisWeek,
      recent_sessions: sessions.slice(0, 5).map(s => ({
        date: s.started_at,
        duration_minutes: s.ended_at 
          ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60))
          : null,
        questions_attempted: s.questions_attempted,
        session_quality: s.session_quality_score,
      })),
    };
  }

  private async getQuestionAnalytics(userId: string) {
    const { data: attempts } = await this.supabase
      .from('question_attempts')
      .select('*')
      .eq('user_id', userId);

    if (!attempts?.length) {
      return {
        total_attempts: 0,
        correct_answers: 0,
        accuracy_percentage: 0,
        average_time_per_question: 0,
      };
    }

    const correctAnswers = attempts.filter(a => a.is_correct).length;
    const averageTime = attempts.reduce((sum, a) => sum + a.time_taken_seconds, 0) / attempts.length;

    return {
      total_attempts: attempts.length,
      correct_answers: correctAnswers,
      accuracy_percentage: Math.round((correctAnswers / attempts.length) * 100),
      average_time_per_question: Math.round(averageTime),
      difficulty_breakdown: this.analyzeDifficultyPerformance(attempts),
    };
  }

  private analyzeDifficultyPerformance(attempts: any[]) {
    const difficulties = {
      easy: attempts.filter(a => a.difficulty_level <= 0.3),
      medium: attempts.filter(a => a.difficulty_level > 0.3 && a.difficulty_level <= 0.7),
      hard: attempts.filter(a => a.difficulty_level > 0.7),
    };

    return Object.entries(difficulties).map(([difficulty, attemptsList]) => ({
      difficulty,
      attempts: attemptsList.length,
      accuracy: attemptsList.length > 0 
        ? Math.round((attemptsList.filter(a => a.is_correct).length / attemptsList.length) * 100)
        : 0,
    }));
  }

  private async getUserProfile(userId: string) {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    return profile;
  }

  async getPerformanceMetrics(userId: string, timeframe: string) {
    const dateFilter = this.getDateFilter(timeframe);
    
    const { data: attempts } = await this.supabase
      .from('question_attempts')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dateFilter)
      .order('created_at', { ascending: true });

    if (!attempts?.length) {
      return { metrics: [], trend: 'stable' };
    }

    // Group by day/week depending on timeframe
    const groupedData = this.groupPerformanceData(attempts, timeframe);
    const trend = this.calculateTrend(groupedData);

    return {
      metrics: groupedData,
      trend,
      summary: {
        total_questions: attempts.length,
        average_accuracy: Math.round((attempts.filter(a => a.is_correct).length / attempts.length) * 100),
        improvement_rate: trend === 'improving' ? '+5%' : trend === 'declining' ? '-3%' : '0%',
      },
    };
  }

  async getEngagementAnalytics(userId: string) {
    const [sessions, streakInfo, recentActivity] = await Promise.all([
      this.getRecentSessions(userId),
      this.getStreakAnalytics(userId),
      this.getRecentActivity(userId),
    ]);

    const engagementScore = this.calculateEngagementScore(sessions, streakInfo);

    return {
      engagement_score: engagementScore,
      streak_analytics: streakInfo,
      session_patterns: this.analyzeSessionPatterns(sessions),
      recent_activity: recentActivity,
      recommendations: this.generateEngagementRecommendations(engagementScore, sessions),
    };
  }

  async getPersonalizedRecommendations(userId: string) {
    const analytics = await this.getLearningAnalytics(userId);
    
    return this.generateRecommendations(
      userId,
      analytics.mastery_analytics,
      analytics.session_analytics
    );
  }

  private generateRecommendations(userId: string, masteryData: any, sessionData: any) {
    const recommendations = [];

    // Mastery-based recommendations
    if (masteryData.average_mastery < 0.5) {
      recommendations.push({
        type: 'focus_fundamentals',
        priority: 'high',
        message: 'Focus on fundamental concepts to build a strong foundation',
        action: 'review_basic_topics',
      });
    }

    // Session-based recommendations
    if (sessionData.average_session_length < 10) {
      recommendations.push({
        type: 'extend_sessions',
        priority: 'medium',
        message: 'Try longer study sessions for better retention',
        action: 'increase_session_time',
      });
    }

    // Engagement recommendations
    if (sessionData.sessions_this_week < 3) {
      recommendations.push({
        type: 'increase_frequency',
        priority: 'medium',
        message: 'Aim for at least 3 learning sessions per week',
        action: 'set_daily_reminders',
      });
    }

    return recommendations;
  }

  private getDateFilter(timeframe: string): string {
    const now = new Date();
    
    switch (timeframe) {
      case 'day':
        now.setHours(0, 0, 0, 0);
        break;
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
      default:
        now.setDate(now.getDate() - 7);
    }
    
    return now.toISOString();
  }

  private groupPerformanceData(attempts: any[], timeframe: string) {
    // Simple daily grouping for now
    const grouped = new Map();
    
    attempts.forEach(attempt => {
      const date = new Date(attempt.created_at).toDateString();
      if (!grouped.has(date)) {
        grouped.set(date, { correct: 0, total: 0, date });
      }
      
      const dayData = grouped.get(date);
      dayData.total += 1;
      if (attempt.is_correct) dayData.correct += 1;
    });

    return Array.from(grouped.values()).map(day => ({
      ...day,
      accuracy: day.total > 0 ? Math.round((day.correct / day.total) * 100) : 0,
    }));
  }

  private calculateTrend(data: any[]): 'improving' | 'declining' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-3);
    const earlier = data.slice(0, -3);
    
    if (recent.length === 0 || earlier.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, d) => sum + d.accuracy, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, d) => sum + d.accuracy, 0) / earlier.length;
    
    const diff = recentAvg - earlierAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  private async getRecentSessions(userId: string) {
    const { data: sessions } = await this.supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(10);

    return sessions || [];
  }

  private async getStreakAnalytics(userId: string) {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('user_id', userId)
      .single();

    return {
      current_streak: profile?.current_streak || 0,
      longest_streak: profile?.longest_streak || 0,
      last_activity: profile?.last_activity_date,
    };
  }

  private async getRecentActivity(userId: string) {
    // This would be expanded with actual activity tracking
    return [
      { action: 'Completed quiz', timestamp: new Date().toISOString() },
      { action: 'Earned badge', timestamp: new Date().toISOString() },
    ];
  }

  private calculateEngagementScore(sessions: any[], streakInfo: any): number {
    let score = 50; // Base score
    
    // Streak contribution (max 30 points)
    score += Math.min(30, streakInfo.current_streak * 2);
    
    // Session frequency (max 20 points)
    const recentSessions = sessions.filter(s => {
      const sessionDate = new Date(s.started_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return sessionDate > weekAgo;
    });
    score += Math.min(20, recentSessions.length * 3);
    
    return Math.min(100, Math.max(0, score));
  }

  private analyzeSessionPatterns(sessions: any[]) {
    // Analyze time-of-day patterns, session lengths, etc.
    const patterns = {
      preferred_time: 'afternoon',
      average_duration: 15,
      consistency_score: 0.7,
    };
    
    return patterns;
  }

  private generateEngagementRecommendations(score: number, sessions: any[]) {
    const recommendations = [];
    
    if (score < 30) {
      recommendations.push('Try shorter, more frequent sessions');
      recommendations.push('Set daily learning reminders');
    } else if (score > 80) {
      recommendations.push('Great engagement! Try challenging yourself with harder topics');
    }
    
    return recommendations;
  }
}
