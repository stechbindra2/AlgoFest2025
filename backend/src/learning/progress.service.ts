import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ProgressService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async updateTopicMastery(
    userId: string,
    topicId: string,
    isCorrect: boolean,
    timeTaken: number
  ) {
    // Get current mastery
    let { data: mastery, error } = await this.supabase
      .from('user_topic_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    if (error || !mastery) {
      // Initialize mastery if doesn't exist
      const { data: newMastery } = await this.supabase
        .from('user_topic_mastery')
        .insert({
          user_id: userId,
          topic_id: topicId,
          mastery_score: 0.1,
          attempts_count: 0,
          correct_answers: 0,
          time_spent_seconds: 0,
          learning_rate: 0.15,
          forgetting_rate: 0.05,
          confidence_interval: 0.3,
        })
        .select()
        .single();
      
      mastery = newMastery;
    }

    // Update mastery using simplified BKT
    const newMasteryScore = this.calculateNewMastery(
      mastery.mastery_score,
      isCorrect,
      mastery.learning_rate,
      mastery.forgetting_rate
    );

    // Update database
    await this.supabase
      .from('user_topic_mastery')
      .update({
        mastery_score: newMasteryScore,
        attempts_count: mastery.attempts_count + 1,
        correct_answers: mastery.correct_answers + (isCorrect ? 1 : 0),
        time_spent_seconds: mastery.time_spent_seconds + timeTaken,
        last_attempt_at: new Date().toISOString(),
        mastery_achieved_at: newMasteryScore >= 0.8 && !mastery.mastery_achieved_at 
          ? new Date().toISOString() 
          : mastery.mastery_achieved_at,
      })
      .eq('user_id', userId)
      .eq('topic_id', topicId);

    return {
      mastery_score: newMasteryScore,
      attempts_count: mastery.attempts_count + 1,
      is_mastered: newMasteryScore >= 0.8,
    };
  }

  async addXp(userId: string, xpAmount: number) {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('total_xp, current_level')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    const newXP = profile.total_xp + xpAmount;
    const newLevel = this.calculateLevel(newXP);
    const leveledUp = newLevel > profile.current_level;

    await this.supabase
      .from('user_profiles')
      .update({
        total_xp: newXP,
        current_level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return {
      new_xp: newXP,
      new_level: newLevel,
      leveled_up: leveledUp,
      xp_gained: xpAmount,
    };
  }

  private calculateNewMastery(
    currentMastery: number,
    isCorrect: boolean,
    learningRate: number,
    forgettingRate: number
  ): number {
    if (isCorrect) {
      // Increase mastery
      const learningGain = learningRate * (1 - currentMastery);
      return Math.min(0.99, currentMastery + learningGain);
    } else {
      // Apply forgetting
      const forgettingLoss = forgettingRate * currentMastery;
      return Math.max(0.01, currentMastery - forgettingLoss);
    }
  }

  private calculateLevel(totalXP: number): number {
    // Level formula: Level = floor(sqrt(XP / 100)) + 1
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
  }
}
