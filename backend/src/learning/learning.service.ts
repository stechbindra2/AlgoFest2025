import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class LearningService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async getTopicsForGrade(grade: number) {
    const { data: topics, error } = await this.supabase
      .from('topics')
      .select(`
        id,
        name,
        description,
        sequence_order,
        learning_objectives,
        estimated_duration_minutes,
        difficulty_base,
        icon_name,
        color_theme,
        grades!inner (grade_number)
      `)
      .eq('grades.grade_number', grade)
      .eq('is_active', true)
      .order('sequence_order');

    if (error) {
      throw new NotFoundException('Failed to fetch topics for grade');
    }

    return topics || [];
  }

  async getUserProgress(userId: string) {
    const { data: progress, error } = await this.supabase
      .from('user_topic_mastery')
      .select(`
        *,
        topics (
          id,
          name,
          description,
          sequence_order,
          icon_name,
          color_theme,
          learning_objectives
        )
      `)
      .eq('user_id', userId)
      .order('topics(sequence_order)');

    if (error) {
      throw new NotFoundException('Failed to fetch user progress');
    }

    // Calculate overall progress statistics
    const totalTopics = progress?.length || 0;
    const masteredTopics = progress?.filter(p => p.mastery_score >= 0.8).length || 0;
    const averageMastery = totalTopics > 0 
      ? progress.reduce((sum, p) => sum + p.mastery_score, 0) / totalTopics 
      : 0;

    return {
      topics: progress || [],
      statistics: {
        total_topics: totalTopics,
        mastered_topics: masteredTopics,
        average_mastery: Math.round(averageMastery * 100) / 100,
        completion_percentage: totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0,
      },
    };
  }

  async getTopicProgress(userId: string, topicId: string) {
    const { data: progress, error } = await this.supabase
      .from('user_topic_mastery')
      .select(`
        *,
        topics (
          name,
          description,
          learning_objectives,
          estimated_duration_minutes
        )
      `)
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new NotFoundException('Failed to fetch topic progress');
    }

    // Get question attempts for this topic
    const { data: attempts } = await this.supabase
      .from('question_attempts')
      .select(`
        is_correct,
        time_taken_seconds,
        created_at,
        questions!inner (topic_id)
      `)
      .eq('user_id', userId)
      .eq('questions.topic_id', topicId)
      .order('created_at', { ascending: false })
      .limit(20);

    const recentAccuracy = attempts?.length 
      ? (attempts.filter(a => a.is_correct).length / attempts.length) * 100
      : 0;

    const averageTime = attempts?.length
      ? attempts.reduce((sum, a) => sum + a.time_taken_seconds, 0) / attempts.length
      : 0;

    return {
      progress: progress || {
        mastery_score: 0,
        attempts_count: 0,
        correct_answers: 0,
        time_spent_seconds: 0,
      },
      recent_performance: {
        accuracy: Math.round(recentAccuracy),
        average_time: Math.round(averageTime),
        attempts_count: attempts?.length || 0,
      },
    };
  }

  async getLearningPath(userId: string) {
    // Get user's current progress
    const userProgress = await this.getUserProgress(userId);
    
    // Get user's grade
    const { data: user } = await this.supabase
      .from('users')
      .select('grade')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all topics for user's grade
    const allTopics = await this.getTopicsForGrade(user.grade);
    
    // Create learning path recommendations
    const learningPath = allTopics.map(topic => {
      const topicProgress = userProgress.topics.find(p => p.topics.id === topic.id);
      const masteryScore = topicProgress?.mastery_score || 0;
      
      let status: 'locked' | 'available' | 'in_progress' | 'mastered';
      let recommendation: string;

      if (masteryScore >= 0.8) {
        status = 'mastered';
        recommendation = 'Topic mastered! You can review or move to the next topic.';
      } else if (masteryScore > 0) {
        status = 'in_progress';
        recommendation = `Continue practicing. You're ${Math.round(masteryScore * 100)}% of the way to mastery!`;
      } else if (this.isTopicUnlocked(topic, userProgress.topics)) {
        status = 'available';
        recommendation = 'Ready to start this topic!';
      } else {
        status = 'locked';
        recommendation = 'Complete previous topics to unlock this one.';
      }

      return {
        ...topic,
        mastery_score: masteryScore,
        status,
        recommendation,
        estimated_completion_time: this.estimateCompletionTime(masteryScore, topic.estimated_duration_minutes),
      };
    });

    return {
      learning_path: learningPath,
      next_recommended_topic: this.getNextRecommendedTopic(learningPath),
      overall_progress: userProgress.statistics,
    };
  }

  async getTopicInsights(userId: string, topicId: string) {
    // Get detailed analytics for a specific topic
    const { data: attempts } = await this.supabase
      .from('question_attempts')
      .select(`
        is_correct,
        time_taken_seconds,
        difficulty_level,
        created_at,
        questions!inner (
          topic_id,
          question_type,
          difficulty_level
        )
      `)
      .eq('user_id', userId)
      .eq('questions.topic_id', topicId)
      .order('created_at', { ascending: false });

    if (!attempts?.length) {
      return {
        insights: [],
        recommendations: ['Start with some basic questions to build your understanding!'],
      };
    }

    const insights = [];
    const recommendations = [];

    // Analyze accuracy by difficulty
    const difficultyGroups = {
      easy: attempts.filter(a => a.questions[0].difficulty_level <= 0.3),
      medium: attempts.filter(a => a.questions[0].difficulty_level <= 0.6),
      hard: attempts.filter(a => a.questions[0].difficulty_level > 0.6),
    };

    Object.entries(difficultyGroups).forEach(([difficulty, group]) => {
      if (group.length > 0) {
        const accuracy = (group.filter(a => a.is_correct).length / group.length) * 100;
        insights.push({
          category: 'difficulty_analysis',
          difficulty,
          accuracy: Math.round(accuracy),
          attempts: group.length,
        });

        if (accuracy < 60 && difficulty === 'easy') {
          recommendations.push('Focus on fundamental concepts - try reviewing the basics!');
        } else if (accuracy > 80 && difficulty === 'hard') {
          recommendations.push('Excellent work on challenging questions! You\'re ready for advanced topics.');
        }
      }
    });

    // Analyze improvement trends
    const recentAttempts = attempts.slice(0, 10);
    const olderAttempts = attempts.slice(10, 20);
    
    if (recentAttempts.length >= 5 && olderAttempts.length >= 5) {
      const recentAccuracy = (recentAttempts.filter(a => a.is_correct).length / recentAttempts.length) * 100;
      const olderAccuracy = (olderAttempts.filter(a => a.is_correct).length / olderAttempts.length) * 100;
      
      const improvement = recentAccuracy - olderAccuracy;
      
      insights.push({
        category: 'progress_trend',
        improvement: Math.round(improvement),
        recent_accuracy: Math.round(recentAccuracy),
        trend: improvement > 10 ? 'improving' : improvement < -10 ? 'declining' : 'stable',
      });

      if (improvement > 10) {
        recommendations.push('Great improvement! Keep up the excellent work!');
      } else if (improvement < -10) {
        recommendations.push('Consider taking a break or reviewing earlier topics.');
      }
    }

    return {
      insights,
      recommendations,
      total_attempts: attempts.length,
      overall_accuracy: Math.round((attempts.filter(a => a.is_correct).length / attempts.length) * 100),
    };
  }

  async createLearningSession(userId: string, topicId: string) {
    try {
      const { data: session, error } = await this.supabase
        .from('learning_sessions')
        .insert({
          user_id: userId,
          topic_id: topicId,
          started_at: new Date().toISOString(),
          questions_attempted: 0,
          questions_correct: 0,
          session_quality_score: 0.5,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating learning session:', error);
        // Return mock session for demo
        return {
          id: 'demo-session-' + Date.now(),
          user_id: userId,
          topic_id: topicId,
          started_at: new Date().toISOString(),
          questions_attempted: 0,
          questions_correct: 0,
        };
      }

      return session;
    } catch (error) {
      console.error('Error in createLearningSession:', error);
      return {
        id: 'demo-session-' + Date.now(),
        user_id: userId,
        topic_id: topicId,
        started_at: new Date().toISOString(),
        questions_attempted: 0,
        questions_correct: 0,
      };
    }
  }

  async getTopicInfo(topicId: string) {
    try {
      const { data: topic, error } = await this.supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (error || !topic) {
        // Return mock topic for demo
        return {
          id: topicId,
          name: 'Financial Basics',
          description: 'Learn fundamental concepts about money and finance',
          learning_objectives: ['Understand what money is', 'Learn about saving'],
          estimated_duration_minutes: 15,
          icon_name: 'coins',
          color_theme: 'blue'
        };
      }

      return topic;
    } catch (error) {
      console.error('Error getting topic info:', error);
      return {
        id: topicId,
        name: 'Financial Basics',
        description: 'Learn fundamental concepts about money and finance',
        learning_objectives: ['Understand what money is', 'Learn about saving'],
        estimated_duration_minutes: 15,
        icon_name: 'coins',
        color_theme: 'blue'
      };
    }
  }

  private isTopicUnlocked(topic: any, userProgress: any[]): boolean {
    // Check if prerequisites are met
    // For now, simple sequential unlock based on sequence_order
    const prerequisiteTopics = userProgress.filter(p => 
      p.topics.sequence_order < topic.sequence_order
    );

    // All previous topics should have some progress (>0.5 mastery)
    return prerequisiteTopics.every(p => p.mastery_score >= 0.5);
  }

  private getNextRecommendedTopic(learningPath: any[]) {
    // Find the first available or in-progress topic
    return learningPath.find(topic => 
      topic.status === 'available' || 
      (topic.status === 'in_progress' && topic.mastery_score < 0.8)
    );
  }

  private estimateCompletionTime(masteryScore: number, baseDuration: number): number {
    // Estimate remaining time based on current mastery
    const completionPercentage = masteryScore * 100;
    const remainingPercentage = 100 - completionPercentage;
    
    // Assume non-linear learning curve
    const remainingTime = (remainingPercentage / 100) * baseDuration * 0.8;
    
    return Math.max(5, Math.round(remainingTime)); // Minimum 5 minutes
  }

  async getRecommendedStudySession(userId: string) {
    const userProgress = await this.getUserProgress(userId);
    const learningPath = await this.getLearningPath(userId);
    
    // Get user's recent activity pattern
    const { data: recentSessions } = await this.supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(5);

    const avgSessionLength = recentSessions?.length
      ? recentSessions.reduce((sum, s) => {
          const duration = s.ended_at 
            ? (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000 / 60
            : 15;
          return sum + duration;
        }, 0) / recentSessions.length
      : 15;

    const recommendedTopic = learningPath.next_recommended_topic;
    
    return {
      recommended_topic: recommendedTopic,
      estimated_session_length: Math.min(30, Math.max(10, avgSessionLength)),
      session_goals: this.generateSessionGoals(recommendedTopic, userProgress),
      motivation_message: this.generateMotivationMessage(userProgress.statistics),
    };
  }

  private generateSessionGoals(topic: any, userProgress: any) {
    if (!topic) {
      return ['Review completed topics', 'Maintain your learning streak'];
    }

    const goals = [];
    
    if (topic.status === 'available') {
      goals.push(`Start learning about ${topic.name}`);
      goals.push('Complete 3-5 practice questions');
    } else if (topic.status === 'in_progress') {
      const currentMastery = Math.round(topic.mastery_score * 100);
      goals.push(`Improve ${topic.name} mastery from ${currentMastery}% to ${Math.min(100, currentMastery + 20)}%`);
      goals.push('Focus on accuracy over speed');
    }

    return goals;
  }

  private generateMotivationMessage(statistics: any) {
    const messages = [
      `You've mastered ${statistics.mastered_topics} topics! Keep up the great work! 🌟`,
      `${statistics.completion_percentage}% complete - you're making amazing progress! 🚀`,
      `Every question makes you smarter about money! Let's learn together! 💪`,
      `You're building skills that will help you your whole life! 🎯`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}
