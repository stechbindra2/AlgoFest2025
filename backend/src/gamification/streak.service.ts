import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StreakService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async updateDailyStreak(userId: string): Promise<{
    current_streak: number;
    longest_streak: number;
    streak_updated: boolean;
    milestone_reached: boolean;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get current profile
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    const lastActivityDate = profile.last_activity_date;
    let newStreak = profile.current_streak || 0;
    let streakUpdated = false;

    if (!lastActivityDate) {
      // First activity ever
      newStreak = 1;
      streakUpdated = true;
    } else {
      const lastDate = new Date(lastActivityDate);
      const todayDate = new Date(today);
      const daysDiff = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day - increment streak
        newStreak += 1;
        streakUpdated = true;
      } else if (daysDiff > 1) {
        // Streak broken - reset to 1
        newStreak = 1;
        streakUpdated = true;
      } else if (daysDiff === 0) {
        // Same day - no change to streak but update last activity
        streakUpdated = false;
      }
    }

    const newLongestStreak = Math.max(profile.longest_streak || 0, newStreak);
    const milestoneReached = this.checkMilestone(newStreak, profile.current_streak || 0);

    // Update profile
    await this.supabase
      .from('user_profiles')
      .update({
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Award streak badges if milestone reached
    if (milestoneReached) {
      await this.awardStreakBadges(userId, newStreak);
    }

    return {
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      streak_updated: streakUpdated,
      milestone_reached: milestoneReached,
    };
  }

  async getStreakInfo(userId: string) {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return {
        current: 0,
        longest: 0,
        last_activity: null,
        days_until_milestone: this.getDaysUntilNextMilestone(0),
        streak_status: 'inactive',
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const lastActivityDate = profile.last_activity_date;
    
    let streakStatus = 'active';
    if (!lastActivityDate) {
      streakStatus = 'inactive';
    } else {
      const daysSinceActivity = Math.floor(
        (new Date(today).getTime() - new Date(lastActivityDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceActivity > 1) {
        streakStatus = 'broken';
      } else if (daysSinceActivity === 1) {
        streakStatus = 'at_risk';
      }
    }

    return {
      current: profile.current_streak || 0,
      longest: profile.longest_streak || 0,
      last_activity: lastActivityDate,
      days_until_milestone: this.getDaysUntilNextMilestone(profile.current_streak || 0),
      streak_status: streakStatus,
      streak_rewards: this.getStreakRewards(profile.current_streak || 0),
    };
  }

  async getStreakLeaderboard(limit: number = 10) {
    const { data: streakLeaders, error } = await this.supabase
      .from('user_profiles')
      .select(`
        user_id,
        display_name,
        avatar_url,
        current_streak,
        longest_streak
      `)
      .order('current_streak', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch streak leaderboard');
    }

    return streakLeaders?.map((leader, index) => ({
      ...leader,
      rank: index + 1,
      streak_tier: this.getStreakTier(leader.current_streak),
    })) || [];
  }

  async getUserStreakHistory(userId: string, days: number = 30) {
    // For now, simulate streak history based on current data
    // In a real implementation, you'd track daily activity logs
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('current_streak, last_activity_date')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return [];
    }

    const history = [];
    const currentStreak = profile.current_streak || 0;
    const lastActivity = profile.last_activity_date;

    if (lastActivity) {
      const startDate = new Date(lastActivity);
      startDate.setDate(startDate.getDate() - currentStreak + 1);

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const isActive = i < currentStreak && date <= new Date(lastActivity);
        
        history.push({
          date: dateStr,
          active: isActive,
          day_of_week: date.getDay(),
        });
      }
    }

    return history.slice(-days); // Return last N days
  }

  private checkMilestone(newStreak: number, oldStreak: number): boolean {
    const milestones = [3, 7, 14, 30, 60, 100, 365];
    return milestones.some(milestone => 
      newStreak >= milestone && oldStreak < milestone
    );
  }

  private getDaysUntilNextMilestone(currentStreak: number): number {
    const milestones = [3, 7, 14, 30, 60, 100, 365];
    const nextMilestone = milestones.find(milestone => milestone > currentStreak);
    return nextMilestone ? nextMilestone - currentStreak : 0;
  }

  private getStreakTier(streak: number): string {
    if (streak >= 100) return 'Legendary';
    if (streak >= 30) return 'Epic';
    if (streak >= 14) return 'Advanced';
    if (streak >= 7) return 'Intermediate';
    if (streak >= 3) return 'Beginner';
    return 'Novice';
  }

  private getStreakRewards(streak: number) {
    const rewards = [];
    
    if (streak >= 3) rewards.push({ type: 'badge', name: '3-Day Starter' });
    if (streak >= 7) rewards.push({ type: 'xp_boost', value: 1.2, name: 'Weekly Warrior' });
    if (streak >= 14) rewards.push({ type: 'badge', name: '2-Week Champion' });
    if (streak >= 30) rewards.push({ type: 'xp_boost', value: 1.5, name: 'Monthly Master' });
    if (streak >= 60) rewards.push({ type: 'badge', name: 'Streak Legend' });
    if (streak >= 100) rewards.push({ type: 'special_unlock', name: 'Hall of Fame' });
    
    return rewards;
  }

  private async awardStreakBadges(userId: string, streak: number) {
    const badgeNames = [];
    
    if (streak === 3) badgeNames.push('3-Day Streak');
    if (streak === 7) badgeNames.push('Week Warrior');
    if (streak === 14) badgeNames.push('Fortnight Fighter');
    if (streak === 30) badgeNames.push('Monthly Master');
    if (streak === 60) badgeNames.push('Streak Legend');
    if (streak === 100) badgeNames.push('Century Club');
    if (streak === 365) badgeNames.push('Year-Long Learner');

    for (const badgeName of badgeNames) {
      try {
        // Get badge ID
        const { data: badge } = await this.supabase
          .from('badges')
          .select('id')
          .eq('name', badgeName)
          .single();

        if (badge) {
          // Check if user already has this badge
          const { data: existingBadge } = await this.supabase
            .from('user_badges')
            .select('id')
            .eq('user_id', userId)
            .eq('badge_id', badge.id)
            .single();

          if (!existingBadge) {
            // Award the badge
            await this.supabase
              .from('user_badges')
              .insert({
                user_id: userId,
                badge_id: badge.id,
                earned_at: new Date().toISOString(),
              });
          }
        }
      } catch (error) {
        console.error(`Failed to award streak badge ${badgeName}:`, error);
      }
    }
  }

  async getStreakMotivation(userId: string) {
    const streakInfo = await this.getStreakInfo(userId);
    
    const motivationalMessages = {
      inactive: [
        "Ready to start your learning journey? Every expert was once a beginner! 🌟",
        "Today is perfect for learning something new about money! 💰",
      ],
      at_risk: [
        "Don't break your streak now! You're doing amazing! 🔥",
        "One more day to keep your streak alive! You've got this! 💪",
      ],
      active: [
        `${streakInfo.current} days strong! Keep up the fantastic work! 🎉`,
        `You're on fire! ${streakInfo.current} days of learning! 🌟`,
      ],
      broken: [
        "No worries! Every new day is a chance to start fresh! 🌅",
        "Time to rebuild that streak even stronger! 💪",
      ],
    };

    const messages = motivationalMessages[streakInfo.streak_status] || motivationalMessages.active;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    return {
      message: randomMessage,
      streak_status: streakInfo.streak_status,
      current_streak: streakInfo.current,
      next_milestone: this.getDaysUntilNextMilestone(streakInfo.current),
    };
  }
}
