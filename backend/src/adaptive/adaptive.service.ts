import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { BanditService } from './bandit.service';
import { MasteryService, MasteryState } from './mastery.service';

@Injectable()
export class AdaptiveService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private banditService: BanditService,
    private masteryService: MasteryService,
  ) {}

  // Add the missing recommendQuestion method that quiz service calls
  async recommendQuestion(userId: string, context: any): Promise<number> {
    // Delegate to bandit service for question recommendation
    return this.banditService.recommendQuestion(userId, context);
  }

  // Add the missing updateModel method that quiz service calls
  async updateModel(
    userId: string,
    topicId: string,
    isCorrect: boolean,
    difficulty: number,
    context: any
  ): Promise<void> {
    // Update both bandit and mastery models
    await Promise.all([
      this.banditService.updateModel(userId, isCorrect, difficulty, context),
      this.masteryService.updateMastery(userId, topicId, isCorrect, difficulty, context.timeTaken || 30)
    ]);
  }

  async getQuestionRecommendation(userId: string, topicId: string) {
    // Build comprehensive user context
    const context = await this.buildUserContext(userId, topicId);
    
    // Get bandit recommendation
    const recommendedDifficulty = await this.recommendQuestion(userId, context);
    
    // Get mastery insights
    const masteryInsights = await this.masteryService.getMasteryInsights(userId, topicId);
    
    return {
      recommended_difficulty: recommendedDifficulty,
      mastery_insights: masteryInsights,
      context_factors: {
        engagement_level: context.engagement_level,
        fatigue_detected: context.avg_time_per_question > 45,
        optimal_session_length: this.calculateOptimalSessionLength(context),
      },
    };
  }

  async processFeedback(userId: string, topicId: string, feedbackData: any) {
    const { isCorrect, difficulty, timeTaken, engagementSignals } = feedbackData;
    
    // Build context for this feedback
    const context = await this.buildUserContext(userId, topicId);
    
    // Add timeTaken to context - this fixes the error
    const contextWithTiming = {
      ...context,
      timeTaken: timeTaken || 30, // Add default if not provided
    };
    
    // Update both models using the unified updateModel method
    await this.updateModel(userId, topicId, isCorrect, difficulty, contextWithTiming);
    
    // Get updated mastery state
    const masteryUpdate: MasteryState = await this.masteryService.updateMastery(
      userId,
      topicId,
      isCorrect,
      difficulty,
      timeTaken
    );
    
    // Check for engagement interventions
    const engagementRecommendation = await this.assessEngagementNeed(
      userId,
      contextWithTiming,
      engagementSignals
    );
    
    return {
      mastery_update: masteryUpdate,
      engagement_recommendation: engagementRecommendation,
      next_session_recommendation: this.getNextSessionRecommendation(contextWithTiming, masteryUpdate),
    };
  }

  async getMasteryInsights(userId: string, topicId: string) {
    return this.masteryService.getMasteryInsights(userId, topicId);
  }

  async getEngagementStatus(userId: string) {
    // Get recent session data
    const { data: recentSessions } = await this.supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(5);

    if (!recentSessions?.length) {
      return {
        status: 'new_user',
        recommendation: 'start_with_easy_topics',
        optimal_session_length: 15, // minutes
      };
    }

    // Analyze engagement patterns
    const avgSessionQuality = recentSessions.reduce((sum, s) => sum + (s.session_quality_score || 0.5), 0) / recentSessions.length;
    const avgSatisfaction = recentSessions.reduce((sum, s) => sum + (s.user_satisfaction_rating || 3), 0) / recentSessions.length;
    
    let status = 'engaged';
    let recommendation = 'continue_current_pace';
    
    if (avgSessionQuality < 0.3 || avgSatisfaction < 2.5) {
      status = 'disengaged';
      recommendation = 'switch_to_story_mode';
    } else if (avgSessionQuality > 0.8 && avgSatisfaction > 4) {
      status = 'highly_engaged';
      recommendation = 'increase_challenge';
    }
    
    return {
      status,
      recommendation,
      metrics: {
        avg_session_quality: avgSessionQuality,
        avg_satisfaction: avgSatisfaction,
        recent_session_count: recentSessions.length,
      },
    };
  }

  private async buildUserContext(userId: string, topicId: string) {
    // Get user's mastery for this topic
    const { data: mastery } = await this.supabase
      .from('user_topic_mastery')
      .select('mastery_score, attempts_count, correct_answers, confidence_interval')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    // Get recent performance (last 10 attempts)
    const { data: recentAttempts } = await this.supabase
      .from('question_attempts')
      .select('is_correct, time_taken_seconds, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get user profile info
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('current_streak, total_xp, current_level, last_activity_date')
      .eq('user_id', userId)
      .single();

    const recentAccuracy = recentAttempts?.length 
      ? recentAttempts.filter(a => a.is_correct).length / recentAttempts.length
      : 0.5;

    const avgTimePerQuestion = recentAttempts?.length
      ? recentAttempts.reduce((sum, a) => sum + a.time_taken_seconds, 0) / recentAttempts.length
      : 30;

    // Calculate engagement level based on various factors
    const streakFactor = Math.min(1, (profile?.current_streak || 0) / 7); // 7-day streak = max engagement
    const timeFactor = Math.max(0, 1 - (avgTimePerQuestion - 20) / 40); // 20s optimal, 60s+ = low engagement
    const accuracyFactor = recentAccuracy;
    
    const engagement_level = (streakFactor + timeFactor + accuracyFactor) / 3;

    return {
      topic_mastery: mastery?.mastery_score || 0,
      recent_accuracy: recentAccuracy,
      avg_time_per_question: avgTimePerQuestion,
      total_attempts: mastery?.attempts_count || 0,
      time_of_day: new Date().getHours(),
      engagement_level,
      streak_days: profile?.current_streak || 0,
      confidence_interval: mastery?.confidence_interval || 0.5,
    };
  }

  private async assessEngagementNeed(userId: string, context: any, engagementSignals: any) {
    // Detect fatigue or frustration
    if (context.avg_time_per_question > 60 || context.recent_accuracy < 0.3) {
      return {
        intervention_needed: true,
        type: 'fatigue_detected',
        recommendation: 'suggest_break_or_easier_content',
        estimated_recovery_time: 10, // minutes
      };
    }

    // Detect boredom (too easy)
    if (context.recent_accuracy > 0.9 && context.avg_time_per_question < 15) {
      return {
        intervention_needed: true,
        type: 'boredom_detected',
        recommendation: 'increase_difficulty_or_add_challenge',
      };
    }

    // Check engagement signals from frontend
    if (engagementSignals?.frustration_indicators > 3) {
      return {
        intervention_needed: true,
        type: 'frustration_detected',
        recommendation: 'provide_hint_or_explanation',
      };
    }

    return {
      intervention_needed: false,
      type: 'optimal_engagement',
      recommendation: 'continue_current_approach',
    };
  }

  private calculateOptimalSessionLength(context: any): number {
    // Base session length: 15 minutes
    let optimalLength = 15;
    
    // Adjust based on engagement
    if (context.engagement_level > 0.8) {
      optimalLength += 10; // Extend for highly engaged users
    } else if (context.engagement_level < 0.4) {
      optimalLength -= 5; // Shorten for low engagement
    }
    
    // Adjust based on performance
    if (context.recent_accuracy > 0.8) {
      optimalLength += 5; // Extend for good performance
    }
    
    // Time of day adjustments
    const hour = context.time_of_day;
    if (hour >= 15 && hour <= 18) { // After school hours
      optimalLength += 5;
    } else if (hour >= 20 || hour <= 7) { // Evening/early morning
      optimalLength -= 5;
    }
    
    return Math.max(5, Math.min(30, optimalLength)); // Clamp between 5-30 minutes
  }

  private getNextSessionRecommendation(context: any, masteryUpdate: MasteryState) {
    const recommendations = [];
    
    if (masteryUpdate.mastery_score >= 0.8) {
      recommendations.push('topic_mastered_move_to_next');
    } else if (masteryUpdate.mastery_score < 0.3) {
      recommendations.push('review_fundamentals');
    }
    
    if (context.engagement_level < 0.4) {
      recommendations.push('try_story_mode_next_session');
    } else if (context.engagement_level > 0.8) {
      recommendations.push('ready_for_challenge_mode');
    }
    
    return {
      recommended_actions: recommendations,
      estimated_time_to_mastery: this.estimateTimeToMastery(masteryUpdate.mastery_score),
      next_difficulty_target: this.calculateNextDifficultyTarget(context, masteryUpdate),
    };
  }

  private estimateTimeToMastery(currentMastery: number): number {
    // Estimate minutes needed to reach 80% mastery
    const targetMastery = 0.8;
    const masteryGap = targetMastery - currentMastery;
    
    if (masteryGap <= 0) return 0;
    
    // Assume average learning rate of 0.05 mastery points per minute of active learning
    const averageLearningRate = 0.05;
    return Math.ceil(masteryGap / averageLearningRate);
  }

  private calculateNextDifficultyTarget(context: any, masteryUpdate: MasteryState): number {
    // Zone of Proximal Development: slightly above current mastery
    const baseDifficulty = masteryUpdate.mastery_score + 0.1;
    
    // Adjust based on confidence
    const confidenceAdjustment = (1 - masteryUpdate.confidence_interval) * 0.1;
    
    // Adjust based on recent performance
    const performanceAdjustment = (context.recent_accuracy - 0.5) * 0.2;
    
    const targetDifficulty = baseDifficulty + confidenceAdjustment + performanceAdjustment;
    
    return Math.max(0.1, Math.min(0.9, targetDifficulty));
  }
}
