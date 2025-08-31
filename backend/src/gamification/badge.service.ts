import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class BadgeService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async checkAndAwardBadges(userId: string, eventData: any): Promise<any[]> {
    // Get all available badges
    const { data: badges } = await this.supabase
      .from('badges')
      .select('*')
      .eq('is_active', true);

    if (!badges) return [];

    // Get user's current badges
    const { data: userBadges } = await this.supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
    const newBadges = [];

    // Check each badge criteria
    for (const badge of badges) {
      if (earnedBadgeIds.has(badge.id)) continue;

      const meetscriteria = await this.evaluateBadgeCriteria(userId, badge.criteria, eventData);
      
      if (meetscriteria) {
        // Award badge
        await this.awardBadge(userId, badge.id);
        newBadges.push(badge);

        // Award XP for badge
        if (badge.xp_reward > 0) {
          await this.supabase
            .from('user_profiles')
            .update({
              total_xp: (await this.getUserXP(userId)) + badge.xp_reward,
            })
            .eq('user_id', userId);
        }
      }
    }

    return newBadges;
  }

  private async evaluateBadgeCriteria(userId: string, criteria: any, eventData: any): Promise<boolean> {
    try {
      // Questions answered badge
      if (criteria.questions_answered) {
        const { count } = await this.supabase
          .from('question_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        return count >= criteria.questions_answered;
      }

      // Consecutive correct answers
      if (criteria.consecutive_correct) {
        return await this.checkConsecutiveCorrect(userId, criteria.consecutive_correct);
      }

      // Quick correct answers
      if (criteria.quick_correct_answers) {
        return await this.checkQuickCorrectAnswers(userId, criteria.quick_correct_answers);
      }

      // Streak days
      if (criteria.streak_days) {
        const { data: profile } = await this.supabase
          .from('user_profiles')
          .select('current_streak')
          .eq('user_id', userId)
          .single();
        
        return profile?.current_streak >= criteria.streak_days;
      }

      // Level reached
      if (criteria.level_reached) {
        return eventData.level_reached >= criteria.level_reached;
      }

      // Topic mastery
      if (criteria.topic_mastery) {
        const { data: masteries } = await this.supabase
          .from('user_topic_mastery')
          .select('mastery_score')
          .eq('user_id', userId)
          .gte('mastery_score', criteria.topic_mastery);
        
        return masteries && masteries.length > 0;
      }

      // Perfect topic completion
      if (criteria.perfect_topic) {
        const { data: masteries } = await this.supabase
          .from('user_topic_mastery')
          .select('mastery_score')
          .eq('user_id', userId)
          .gte('mastery_score', 1.0);
        
        return masteries && masteries.length > 0;
      }

      return false;
    } catch (error) {
      console.error('Error evaluating badge criteria:', error);
      return false;
    }
  }

  private async checkConsecutiveCorrect(userId: string, required: number): Promise<boolean> {
    const { data: attempts } = await this.supabase
      .from('question_attempts')
      .select('is_correct')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(required);

    if (!attempts || attempts.length < required) return false;

    return attempts.every(attempt => attempt.is_correct);
  }

  private async checkQuickCorrectAnswers(userId: string, required: number): Promise<boolean> {
    const { data: attempts } = await this.supabase
      .from('question_attempts')
      .select('is_correct, time_taken_seconds')
      .eq('user_id', userId)
      .eq('is_correct', true)
      .lte('time_taken_seconds', 20)
      .order('created_at', { ascending: false });

    return attempts && attempts.length >= required;
  }

  private async awardBadge(userId: string, badgeId: string) {
    await this.supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
        earned_at: new Date().toISOString(),
      });
  }

  private async getUserXP(userId: string): Promise<number> {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('total_xp')
      .eq('user_id', userId)
      .single();

    return profile?.total_xp || 0;
  }

  async getRecentBadges(userId: string, limit: number = 5) {
    const { data: badges } = await this.supabase
      .from('user_badges')
      .select(`
        earned_at,
        badges (
          name,
          description,
          icon_url,
          rarity,
          xp_reward
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(limit);

    return badges || [];
  }

  async getBadgeProgress(userId: string) {
    // Get all badges with progress indicators
    const { data: allBadges } = await this.supabase
      .from('badges')
      .select('*')
      .eq('is_active', true);

    const { data: userBadges } = await this.supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

    const badgeProgress = await Promise.all(
      allBadges?.map(async (badge) => {
        const isEarned = earnedBadgeIds.has(badge.id);
        const progress = isEarned ? 1.0 : await this.calculateBadgeProgress(userId, badge.criteria);

        return {
          ...badge,
          is_earned: isEarned,
          progress,
        };
      }) || []
    );

    return badgeProgress.sort((a, b) => {
      if (a.is_earned !== b.is_earned) return a.is_earned ? 1 : -1;
      return b.progress - a.progress;
    });
  }

  private async calculateBadgeProgress(userId: string, criteria: any): Promise<number> {
    try {
      if (criteria.questions_answered) {
        const { count } = await this.supabase
          .from('question_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        return Math.min(1.0, count / criteria.questions_answered);
      }

      if (criteria.streak_days) {
        const { data: profile } = await this.supabase
          .from('user_profiles')
          .select('current_streak')
          .eq('user_id', userId)
          .single();
        
        return Math.min(1.0, (profile?.current_streak || 0) / criteria.streak_days);
      }

      // Add more progress calculations as needed
      return 0;
    } catch (error) {
      return 0;
    }
  }
}
