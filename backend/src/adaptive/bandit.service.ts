import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

interface BanditContext {
  topic_mastery: number;
  recent_accuracy: number;
  avg_time_per_question: number;
  total_attempts: number;
  time_of_day: number;
  engagement_level: number;
  streak_days: number;
}

interface ArmParameters {
  alpha: number; // Success count + 1
  beta: number;  // Failure count + 1
}

@Injectable()
export class BanditService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async recommendQuestion(userId: string, context: BanditContext): Promise<number> {
    // Get user's bandit model
    let { data: model, error } = await this.supabase
      .from('bandit_models')
      .select('*')
      .eq('user_id', userId)
      .eq('model_type', 'thompson_sampling')
      .single();

    if (error || !model) {
      // Initialize model if doesn't exist
      model = await this.initializeBanditModel(userId);
    }

    // Extract arm parameters
    const armParams = model.arm_parameters as Record<string, ArmParameters>;
    
    // Calculate contextual adjustments
    const contextualAdjustments = this.calculateContextualAdjustments(context);
    
    // Thompson Sampling: Sample from Beta distributions
    const samples = {
      easy: this.sampleBeta(
        armParams.easy.alpha + contextualAdjustments.easy,
        armParams.easy.beta
      ),
      medium: this.sampleBeta(
        armParams.medium.alpha + contextualAdjustments.medium,
        armParams.medium.beta
      ),
      hard: this.sampleBeta(
        armParams.hard.alpha + contextualAdjustments.hard,
        armParams.hard.beta
      ),
    };

    // Select arm with highest sample
    const selectedArm = Object.keys(samples).reduce((a, b) => 
      samples[a] > samples[b] ? a : b
    );

    // Map arms to difficulty values
    const difficultyMap = {
      easy: 0.3,
      medium: 0.6,
      hard: 0.9,
    };

    // Add some randomness for exploration
    const baseDifficulty = difficultyMap[selectedArm];
    const explorationNoise = (Math.random() - 0.5) * 0.2; // ±0.1 variation
    
    return Math.max(0.1, Math.min(1.0, baseDifficulty + explorationNoise));
  }

  async updateModel(
    userId: string, 
    isCorrect: boolean, 
    difficulty: number, 
    context: BanditContext
  ): Promise<void> {
    // Get current model
    const { data: model } = await this.supabase
      .from('bandit_models')
      .select('*')
      .eq('user_id', userId)
      .eq('model_type', 'thompson_sampling')
      .single();

    if (!model) return;

    // Determine which arm was used
    const arm = this.getDifficultyArm(difficulty);
    const armParams = model.arm_parameters as Record<string, ArmParameters>;

    // Update Beta parameters based on outcome
    if (isCorrect) {
      armParams[arm].alpha += 1;
    } else {
      armParams[arm].beta += 1;
    }

    // Apply decay to prevent over-confidence
    const decayFactor = 0.995;
    Object.keys(armParams).forEach(key => {
      armParams[key].alpha = Math.max(1, armParams[key].alpha * decayFactor);
      armParams[key].beta = Math.max(1, armParams[key].beta * decayFactor);
    });

    // Update model in database
    await this.supabase
      .from('bandit_models')
      .update({
        arm_parameters: armParams,
        context_features: context,
        total_interactions: model.total_interactions + 1,
        last_updated: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('model_type', 'thompson_sampling');
  }

  private async initializeBanditModel(userId: string) {
    const initialArmParams = {
      easy: { alpha: 2, beta: 1 },    // Slightly optimistic about easy questions
      medium: { alpha: 1.5, beta: 1.5 }, // Neutral
      hard: { alpha: 1, beta: 2 },    // Pessimistic about hard questions
    };

    const { data: model, error } = await this.supabase
      .from('bandit_models')
      .insert({
        user_id: userId,
        model_type: 'thompson_sampling',
        context_features: {},
        arm_parameters: initialArmParams,
        exploration_rate: 0.1,
        total_interactions: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to initialize bandit model');
    }

    return model;
  }

  private calculateContextualAdjustments(context: BanditContext) {
    // Adjust arm preferences based on context
    const adjustments = { easy: 0, medium: 0, hard: 0 };

    // Topic mastery influence
    if (context.topic_mastery < 0.3) {
      adjustments.easy += 1.0;
      adjustments.medium -= 0.5;
      adjustments.hard -= 1.0;
    } else if (context.topic_mastery > 0.7) {
      adjustments.easy -= 1.0;
      adjustments.medium += 0.5;
      adjustments.hard += 1.0;
    }

    // Recent performance influence
    if (context.recent_accuracy < 0.5) {
      adjustments.easy += 0.8;
      adjustments.medium -= 0.3;
      adjustments.hard -= 0.8;
    } else if (context.recent_accuracy > 0.8) {
      adjustments.easy -= 0.5;
      adjustments.medium += 0.3;
      adjustments.hard += 0.7;
    }

    // Time pressure (slower = easier questions)
    if (context.avg_time_per_question > 45) {
      adjustments.easy += 0.5;
      adjustments.hard -= 0.5;
    }

    // Engagement level (low engagement = easier/more engaging content)
    if (context.engagement_level < 0.4) {
      adjustments.easy += 0.7;
      adjustments.medium -= 0.2;
      adjustments.hard -= 0.7;
    }

    // Time of day (afternoon/evening = easier questions)
    if (context.time_of_day >= 15) { // 3 PM onwards
      adjustments.easy += 0.3;
      adjustments.hard -= 0.3;
    }

    return adjustments;
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Simple Beta distribution sampling using Gamma distributions
    const gamma1 = this.sampleGamma(alpha, 1);
    const gamma2 = this.sampleGamma(beta, 1);
    return gamma1 / (gamma1 + gamma2);
  }

  private sampleGamma(shape: number, scale: number): number {
    // Marsaglia and Tsang's Method for Gamma sampling
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    
    while (true) {
      let x, v;
      do {
        x = this.sampleNormal(0, 1);
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.331 * x * x * x * x) {
        return d * v * scale;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
  }

  private sampleNormal(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  private getDifficultyArm(difficulty: number): string {
    if (difficulty <= 0.4) return 'easy';
    if (difficulty <= 0.7) return 'medium';
    return 'hard';
  }
}
