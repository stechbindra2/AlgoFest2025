import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { BadgeService } from './badge.service';
import { StreakService } from './streak.service';

@Injectable()
export class GamificationService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private badgeService: BadgeService,
    private streakService: StreakService,
  ) {}

  async addXP(userId: string, xpAmount: number): Promise<{ 
    newXP: number; 
    newLevel: number; 
    leveledUp: boolean; 
    badges?: any[] 
  }> {
    // Get current profile
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

    // Update profile
    await this.supabase
      .from('user_profiles')
      .update({
        total_xp: newXP,
        current_level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Check for new badges
    const newBadges = await this.badgeService.checkAndAwardBadges(userId, {
      xp_gained: xpAmount,
      total_xp: newXP,
      level_reached: newLevel,
      leveled_up: leveledUp,
    });

    // Update streak
    await this.streakService.updateDailyStreak(userId);

    return {
      newXP,
      newLevel,
      leveledUp,
      badges: newBadges.length > 0 ? newBadges : undefined,
    };
  }

  private calculateLevel(totalXP: number): number {
    // Level formula: Level = floor(sqrt(XP / 100))
    // Level 1: 0-99 XP, Level 2: 100-399 XP, Level 3: 400-899 XP, etc.
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
  }

  getXPForLevel(level: number): number {
    // XP required for a specific level
    return Math.pow(level - 1, 2) * 100;
  }

  getXPToNextLevel(currentXP: number): { current: number; required: number; progress: number } {
    const currentLevel = this.calculateLevel(currentXP);
    const nextLevelXP = this.getXPForLevel(currentLevel + 1);
    const currentLevelXP = this.getXPForLevel(currentLevel);
    
    const progress = (currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP);
    
    return {
      current: currentXP - currentLevelXP,
      required: nextLevelXP - currentLevelXP,
      progress: Math.min(1, Math.max(0, progress)),
    };
  }

  async getGamificationStatus(userId: string) {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    const xpProgress = this.getXPToNextLevel(profile.total_xp);
    const recentBadges = await this.badgeService.getRecentBadges(userId, 5);
    const streakInfo = await this.streakService.getStreakInfo(userId);

    return {
      level: profile.current_level,
      totalXP: profile.total_xp,
      xpProgress,
      streak: streakInfo,
      recentBadges,
      stats: {
        current_streak: profile.current_streak,
        longest_streak: profile.longest_streak,
        last_activity: profile.last_activity_date,
      },
    };
  }

  async calculateEngagementBoost(userId: string): Promise<{
    shouldBoost: boolean;
    boostType: 'story' | 'game' | 'celebration' | null;
    reason: string;
  }> {
    // Get recent session data
    const { data: recentSessions } = await this.supabase
      .from('learning_sessions')
      .select('session_quality_score, questions_attempted, user_satisfaction_rating')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(5);

    if (!recentSessions?.length) {
      return { shouldBoost: false, boostType: null, reason: 'No session data' };
    }

    // Calculate engagement metrics
    const avgQuality = recentSessions.reduce((sum, s) => sum + (s.session_quality_score || 0.5), 0) / recentSessions.length;
    const avgSatisfaction = recentSessions.reduce((sum, s) => sum + (s.user_satisfaction_rating || 3), 0) / recentSessions.length;
    const avgQuestions = recentSessions.reduce((sum, s) => sum + s.questions_attempted, 0) / recentSessions.length;

    // Check for fatigue indicators
    if (avgQuality < 0.3 || avgSatisfaction < 2.5) {
      return {
        shouldBoost: true,
        boostType: 'story',
        reason: 'Low engagement detected - switching to story mode',
      };
    }

    // Check for high performance (celebration)
    if (avgQuality > 0.8 && avgSatisfaction > 4) {
      return {
        shouldBoost: true,
        boostType: 'celebration',
        reason: 'Excellent performance - time to celebrate!',
      };
    }

    // Check for repetitive patterns (need variety)
    if (avgQuestions > 10 && avgQuality > 0.6) {
      return {
        shouldBoost: true,
        boostType: 'game',
        reason: 'Good progress - unlocking mini-game reward!',
      };
    }

    return { shouldBoost: false, boostType: null, reason: 'Engagement levels normal' };
  }
}
