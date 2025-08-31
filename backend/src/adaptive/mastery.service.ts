import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

// Export the interface so it can be used by other modules
export interface MasteryState {
  mastery_score: number;
  learning_rate: number;
  forgetting_rate: number;
  confidence_interval: number;
}

// Additional interfaces for enhanced mastery tracking
export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence_level: number;
}

export interface DecayFunction {
  base_rate: number;
  time_factor: number;
  last_update: Date;
}

export interface ConceptualGraph {
  node_id: string;
  connections: Array<{
    target_node: string;
    strength: number;
    relationship_type: 'prerequisite' | 'related' | 'advanced';
  }>;
}

// Enhanced mastery state for advanced tracking
export interface EnhancedMasteryState extends MasteryState {
  conceptual_understanding: ConfidenceInterval;
  procedural_fluency: ConfidenceInterval;
  transfer_ability: ConfidenceInterval;
  retention_strength: DecayFunction;
  connection_mapping: ConceptualGraph;
}

@Injectable()
export class MasteryService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async updateMastery(
    userId: string,
    topicId: string,
    isCorrect: boolean,
    difficulty: number,
    timeTaken: number
  ): Promise<MasteryState> {
    // Get current mastery state
    let { data: mastery, error } = await this.supabase
      .from('user_topic_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    if (error || !mastery) {
      // Initialize mastery if doesn't exist
      mastery = await this.initializeMastery(userId, topicId);
    }

    // Apply Bayesian Knowledge Tracing update
    const updatedMastery = this.applyBKTUpdate(mastery, isCorrect, difficulty, timeTaken);

    // Update in database
    const { data: updated, error: updateError } = await this.supabase
      .from('user_topic_mastery')
      .update({
        mastery_score: updatedMastery.mastery_score,
        learning_rate: updatedMastery.learning_rate,
        forgetting_rate: updatedMastery.forgetting_rate,
        confidence_interval: updatedMastery.confidence_interval,
        attempts_count: mastery.attempts_count + 1,
        correct_answers: mastery.correct_answers + (isCorrect ? 1 : 0),
        time_spent_seconds: mastery.time_spent_seconds + timeTaken,
        last_attempt_at: new Date().toISOString(),
        mastery_achieved_at: updatedMastery.mastery_score >= 0.8 && !mastery.mastery_achieved_at 
          ? new Date().toISOString() 
          : mastery.mastery_achieved_at,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update mastery');
    }

    return updatedMastery;
  }

  private async initializeMastery(userId: string, topicId: string) {
    const initialMastery = {
      user_id: userId,
      topic_id: topicId,
      mastery_score: 0.1, // Start with low mastery
      attempts_count: 0,
      correct_answers: 0,
      time_spent_seconds: 0,
      learning_rate: 0.15, // How quickly they learn from correct answers
      forgetting_rate: 0.05, // How quickly they forget without practice
      confidence_interval: 0.3, // Uncertainty in mastery estimate
    };

    const { data: created, error } = await this.supabase
      .from('user_topic_mastery')
      .insert(initialMastery)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to initialize mastery');
    }

    return created;
  }

  private applyBKTUpdate(
    currentMastery: any,
    isCorrect: boolean,
    difficulty: number,
    timeTaken: number
  ): MasteryState {
    let { mastery_score, learning_rate, forgetting_rate, confidence_interval } = currentMastery;

    // Adjust learning rate based on difficulty and performance
    const difficultyAdjustment = 1 + (difficulty - 0.5) * 0.3; // More learning from harder questions
    const timeAdjustment = Math.max(0.5, Math.min(1.5, 30 / timeTaken)); // Faster response = higher confidence
    
    const adjustedLearningRate = learning_rate * difficultyAdjustment * timeAdjustment;

    if (isCorrect) {
      // Correct answer: increase mastery
      const evidence_strength = 1.0 - mastery_score; // More impact when mastery is low
      const learning_gain = adjustedLearningRate * evidence_strength;
      
      mastery_score = Math.min(0.99, mastery_score + learning_gain);
      confidence_interval = Math.max(0.05, confidence_interval * 0.95); // Increase confidence
      
      // Adaptive learning rate: decrease as mastery increases
      learning_rate = Math.max(0.05, learning_rate * 0.98);
    } else {
      // Incorrect answer: apply forgetting and reset some mastery
      const evidence_strength = mastery_score; // More impact when mastery was high
      const forgetting_loss = forgetting_rate * evidence_strength * 2; // Double forgetting on errors
      
      mastery_score = Math.max(0.01, mastery_score - forgetting_loss);
      confidence_interval = Math.min(0.5, confidence_interval * 1.1); // Decrease confidence
      
      // Increase learning rate slightly to recover faster
      learning_rate = Math.min(0.3, learning_rate * 1.02);
    }

    // Apply time-based forgetting (very gradual)
    const timeSinceLastAttempt = this.getTimeSinceLastAttempt(currentMastery.last_attempt_at);
    const timeBasedForgetting = forgetting_rate * (timeSinceLastAttempt / (24 * 60 * 60 * 1000)); // Per day
    mastery_score = Math.max(0.01, mastery_score - timeBasedForgetting);

    return {
      mastery_score: Math.round(mastery_score * 10000) / 10000, // Round to 4 decimal places
      learning_rate: Math.round(learning_rate * 10000) / 10000,
      forgetting_rate: forgetting_rate,
      confidence_interval: Math.round(confidence_interval * 10000) / 10000,
    };
  }

  private getTimeSinceLastAttempt(lastAttemptAt: string | null): number {
    if (!lastAttemptAt) return 0;
    return Date.now() - new Date(lastAttemptAt).getTime();
  }

  async getMasteryInsights(userId: string, topicId: string) {
    const { data: mastery } = await this.supabase
      .from('user_topic_mastery')
      .select(`
        *,
        topics (name, description, learning_objectives)
      `)
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    if (!mastery) {
      return null;
    }

    const accuracy = mastery.attempts_count > 0 
      ? mastery.correct_answers / mastery.attempts_count 
      : 0;

    const avgTimePerQuestion = mastery.attempts_count > 0
      ? mastery.time_spent_seconds / mastery.attempts_count
      : 0;

    // Predict performance on next question
    const nextQuestionSuccess = this.predictNextQuestionSuccess(mastery);

    // Recommend optimal difficulty
    const optimalDifficulty = this.recommendOptimalDifficulty(mastery);

    return {
      mastery_level: this.getMasteryLevel(mastery.mastery_score),
      mastery_score: mastery.mastery_score,
      confidence: 1 - mastery.confidence_interval,
      accuracy,
      avg_time_per_question: avgTimePerQuestion,
      total_attempts: mastery.attempts_count,
      predicted_success_rate: nextQuestionSuccess,
      recommended_difficulty: optimalDifficulty,
      strengths: this.identifyStrengths(mastery),
      improvement_areas: this.identifyImprovementAreas(mastery),
    };
  }

  private getMasteryLevel(score: number): string {
    if (score >= 0.8) return 'Expert';
    if (score >= 0.6) return 'Proficient';
    if (score >= 0.4) return 'Developing';
    if (score >= 0.2) return 'Beginning';
    return 'Novice';
  }

  private predictNextQuestionSuccess(mastery: any): number {
    // Simple prediction based on current mastery and confidence
    const base_probability = mastery.mastery_score;
    const confidence_adjustment = (1 - mastery.confidence_interval) * 0.1;
    return Math.min(0.95, base_probability + confidence_adjustment);
  }

  private recommendOptimalDifficulty(mastery: any): number {
    // Zone of Proximal Development: slightly above current mastery
    const base_difficulty = mastery.mastery_score + 0.1;
    const confidence_adjustment = mastery.confidence_interval * 0.2; // More conservative when uncertain
    return Math.max(0.1, Math.min(0.9, base_difficulty - confidence_adjustment));
  }

  private identifyStrengths(mastery: any): string[] {
    const strengths = [];
    
    if (mastery.mastery_score >= 0.7) {
      strengths.push('Strong understanding of core concepts');
    }
    
    const accuracy = mastery.correct_answers / Math.max(1, mastery.attempts_count);
    if (accuracy >= 0.8) {
      strengths.push('High accuracy in responses');
    }
    
    if (mastery.learning_rate <= 0.1) {
      strengths.push('Consistent performance');
    }
    
    return strengths;
  }

  private identifyImprovementAreas(mastery: any): string[] {
    const areas = [];
    
    if (mastery.mastery_score < 0.5) {
      areas.push('Needs more practice with fundamental concepts');
    }
    
    const accuracy = mastery.correct_answers / Math.max(1, mastery.attempts_count);
    if (accuracy < 0.6) {
      areas.push('Focus on accuracy improvement');
    }
    
    if (mastery.confidence_interval > 0.3) {
      areas.push('More practice needed to build confidence');
    }
    
    return areas;
  }

  // Enhanced methods for advanced mastery tracking
  async getEnhancedMasteryState(userId: string, topicId: string): Promise<EnhancedMasteryState | null> {
    const basicMastery = await this.getMasteryInsights(userId, topicId);
    
    if (!basicMastery) return null;

    // Build enhanced mastery state with additional dimensions
    return {
      mastery_score: basicMastery.mastery_score,
      learning_rate: 0.15, // Default from basic mastery
      forgetting_rate: 0.05, // Default from basic mastery
      confidence_interval: 1 - basicMastery.confidence,
      conceptual_understanding: {
        lower: Math.max(0, basicMastery.mastery_score - 0.1),
        upper: Math.min(1, basicMastery.mastery_score + 0.1),
        confidence_level: basicMastery.confidence,
      },
      procedural_fluency: {
        lower: Math.max(0, basicMastery.accuracy - 0.1),
        upper: Math.min(1, basicMastery.accuracy + 0.1),
        confidence_level: basicMastery.confidence,
      },
      transfer_ability: {
        lower: 0.3, // Placeholder for transfer learning capability
        upper: 0.7,
        confidence_level: 0.5,
      },
      retention_strength: {
        base_rate: 0.05,
        time_factor: 1.0,
        last_update: new Date(),
      },
      connection_mapping: {
        node_id: topicId,
        connections: [], // Would be populated with prerequisite/related topics
      },
    };
  }

  async updateMasteryWithTransfer(
    userId: string,
    topicId: string,
    sourceTopicId: string,
    transferStrength: number
  ): Promise<MasteryState> {
    // Get mastery from source topic
    const { data: sourceMastery } = await this.supabase
      .from('user_topic_mastery')
      .select('mastery_score')
      .eq('user_id', userId)
      .eq('topic_id', sourceTopicId)
      .single();

    if (!sourceMastery) {
      throw new Error('Source topic mastery not found');
    }

    // Apply transfer learning boost
    const transferBoost = sourceMastery.mastery_score * transferStrength * 0.3; // Max 30% transfer

    // Get current mastery
    let { data: currentMastery } = await this.supabase
      .from('user_topic_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    if (!currentMastery) {
      currentMastery = await this.initializeMastery(userId, topicId);
    }

    // Apply transfer boost
    const boostedMasteryScore = Math.min(0.99, currentMastery.mastery_score + transferBoost);

    await this.supabase
      .from('user_topic_mastery')
      .update({
        mastery_score: boostedMasteryScore,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('topic_id', topicId);

    return {
      mastery_score: boostedMasteryScore,
      learning_rate: currentMastery.learning_rate,
      forgetting_rate: currentMastery.forgetting_rate,
      confidence_interval: currentMastery.confidence_interval,
    };
  }
}
