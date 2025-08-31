import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { AdaptiveService } from '../adaptive/adaptive.service';
import { ProgressService } from './progress.service';

@Injectable()
export class QuizService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private adaptiveService: AdaptiveService,
    private progressService: ProgressService,
  ) {}

  async getNextQuestion(userId: string, topicId: string) {
    // Get user context for adaptive algorithm
    const context = await this.buildUserContext(userId, topicId);
    
    // Get recommended difficulty from adaptive service
    const recommendedDifficulty = await this.adaptiveService.recommendQuestion(
      userId,
      context
    );

    // Get question matching the recommended difficulty
    const { data: questions, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .gte('difficulty_level', recommendedDifficulty - 0.1)
      .lte('difficulty_level', recommendedDifficulty + 0.1)
      .limit(5);

    if (error || !questions?.length) {
      // Fallback to any question from the topic
      const { data: fallbackQuestions } = await this.supabase
        .from('questions')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_active', true)
        .limit(5);

      if (!fallbackQuestions?.length) {
        throw new NotFoundException('No questions available for this topic');
      }

      return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
    }

    // Return a random question from the matching set
    return questions[Math.floor(Math.random() * questions.length)];
  }

  async submitAnswer(userId: string, questionId: string, answerData: any) {
    const { answer, timeTaken = 30, hintUsed = false } = answerData;

    // Get question details
    const { data: question, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error || !question) {
      throw new NotFoundException('Question not found');
    }

    // Check if answer is correct
    const correctAnswer = question.question_data?.correct_answer;
    const isCorrect = answer === correctAnswer;

    // Calculate XP earned
    const baseXP = this.calculateBaseXP(isCorrect, question.difficulty_level);
    const timeBonus = this.calculateTimeBonus(timeTaken);
    const hintPenalty = hintUsed ? 0.8 : 1.0;
    const xpEarned = Math.round(baseXP * timeBonus * hintPenalty);

    // Store the attempt
    await this.supabase
      .from('question_attempts')
      .insert({
        user_id: userId,
        question_id: questionId,
        user_answer: answer,
        is_correct: isCorrect,
        time_taken_seconds: timeTaken,
        difficulty_level: question.difficulty_level,
        xp_earned: xpEarned,
        hint_used: hintUsed,
      });

    // Update progress and XP
    await Promise.all([
      this.progressService.updateTopicMastery(userId, question.topic_id, isCorrect, timeTaken),
      this.progressService.addXp(userId, xpEarned),
    ]);

    // Update adaptive model
    await this.adaptiveService.updateModel(
      userId,
      question.topic_id,
      isCorrect,
      question.difficulty_level,
      {
        ...await this.buildUserContext(userId, question.topic_id),
        timeTaken: timeTaken,
      }
    );

    // Generate feedback
    const feedback = this.generateFeedback(isCorrect, question.difficulty_level);

    return {
      is_correct: isCorrect,
      correct_answer: correctAnswer,
      explanation: question.explanation || this.generateExplanation(question, isCorrect),
      xp_earned: xpEarned,
      feedback: feedback,
    };
  }

  private calculateBaseXP(isCorrect: boolean, difficulty: number): number {
    if (!isCorrect) return 10; // Participation XP
    
    const basePoints = 50;
    const difficultyMultiplier = 1 + difficulty;
    return Math.round(basePoints * difficultyMultiplier);
  }

  private calculateTimeBonus(timeTaken: number): number {
    // Optimal time is around 30 seconds
    if (timeTaken < 15) return 1.3; // Too fast, might be guessing
    if (timeTaken < 30) return 1.5; // Perfect timing
    if (timeTaken < 60) return 1.2; // Reasonable time
    return 1.0; // Took a while
  }

  private generateFeedback(isCorrect: boolean, difficulty: number): string {
    if (isCorrect) {
      if (difficulty > 0.7) {
        return 'Outstanding! You mastered a challenging concept! 🌟';
      } else if (difficulty > 0.4) {
        return 'Excellent work! You\'re really getting it! 🎉';
      } else {
        return 'Great job! Keep up the good work! 👍';
      }
    } else {
      if (difficulty > 0.7) {
        return 'This was a tough one! Let\'s review and try again. 💪';
      } else if (difficulty > 0.4) {
        return 'Close! Let\'s think about this step by step. 🤔';
      } else {
        return 'No worries! Every mistake is a chance to learn. 😊';
      }
    }
  }

  private async buildUserContext(userId: string, topicId: string) {
    // Get user's recent performance
    const { data: recentAttempts } = await this.supabase
      .from('question_attempts')
      .select('is_correct, time_taken_seconds, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get current mastery for this topic
    const { data: mastery } = await this.supabase
      .from('user_topic_mastery')
      .select('mastery_score, attempts_count, confidence_interval')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    // Get user profile info
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('current_streak, total_xp, current_level')
      .eq('user_id', userId)
      .single();

    const recentAccuracy = recentAttempts?.length 
      ? recentAttempts.filter(a => a.is_correct).length / recentAttempts.length
      : 0.5;

    const avgTimePerQuestion = recentAttempts?.length
      ? recentAttempts.reduce((sum, a) => sum + a.time_taken_seconds, 0) / recentAttempts.length
      : 30;

    // Calculate engagement level
    const engagementLevel = this.calculateEngagementLevel(recentAccuracy, avgTimePerQuestion);

    return {
      topic_mastery: mastery?.mastery_score || 0,
      recent_accuracy: recentAccuracy,
      avg_time_per_question: avgTimePerQuestion,
      total_attempts: mastery?.attempts_count || 0,
      time_of_day: new Date().getHours(),
      engagement_level: engagementLevel,
      streak_days: profile?.current_streak || 0,
      confidence_interval: mastery?.confidence_interval || 0.5,
    };
  }

  private calculateEngagementLevel(accuracy: number, avgTime: number): number {
    // Simple engagement calculation based on accuracy and response time
    const accuracyFactor = accuracy;
    const timeFactor = Math.max(0, 1 - (avgTime - 20) / 40); // 20s optimal, 60s+ = low engagement
    return (accuracyFactor + timeFactor) / 2;
  }

  private generateExplanation(question: any, isCorrect: boolean): string {
    if (isCorrect) {
      return 'Excellent! You understand this concept well. Keep up the great work!';
    } else {
      const explanations = [
        'Not quite right, but that\'s okay! Learning takes practice. Let\'s review this concept.',
        'Close, but let\'s think about this differently. Every mistake helps us learn!',
        'That\'s not the answer we\'re looking for. Let\'s break this down step by step.',
      ];
      return explanations[Math.floor(Math.random() * explanations.length)];
    }
  }

  async getQuestionHint(userId: string, questionId: string) {
    // Get question details
    const { data: question } = await this.supabase
      .from('questions')
      .select('question_text, question_data, topic_id')
      .eq('id', questionId)
      .single();

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Generate contextual hint
    const hints = [
      'Think about what you\'ve learned about this topic recently.',
      'Consider the key concepts we\'ve covered in this lesson.',
      'What would you do in this situation in real life?',
      'Remember to read the question carefully and consider all options.',
    ];

    return {
      hint: hints[Math.floor(Math.random() * hints.length)],
      hint_used: true,
    };
  }

  async getTopicQuestions(topicId: string, limit: number = 10) {
    const { data: questions, error } = await this.supabase
      .from('questions')
      .select('id, question_text, difficulty_level, estimated_time_seconds')
      .eq('topic_id', topicId)
      .eq('is_active', true)
      .order('difficulty_level')
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch topic questions');
    }

    return questions || [];
  }

  async getUserQuestionHistory(userId: string, topicId?: string) {
    let query = this.supabase
      .from('question_attempts')
      .select(`
        *,
        questions (
          question_text,
          topic_id,
          difficulty_level
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (topicId) {
      query = query.eq('questions.topic_id', topicId);
    }

    const { data: attempts, error } = await query;

    if (error) {
      return [];
    }

    return attempts || [];
  }
}
