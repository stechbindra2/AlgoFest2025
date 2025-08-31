import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async findById(userId: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select(`
        *,
        user_profiles (
          display_name,
          avatar_url,
          total_xp,
          current_level,
          current_streak,
          longest_streak,
          last_activity_date,
          preferred_learning_style,
          accessibility_settings
        )
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return null;
    }

    return user;
  }

  async updateProfile(userId: string, updateData: UpdateUserDto) {
    // Update user_profiles table
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update profile');
    }

    return profile;
  }

  async getUserProgress(userId: string) {
    // Get user's topic mastery
    const { data: masteryData } = await this.supabase
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

    // Get overall statistics
    const totalTopics = masteryData?.length || 0;
    const masteredTopics = masteryData?.filter(m => m.mastery_score >= 0.8).length || 0;
    const averageMastery = totalTopics > 0 
      ? masteryData.reduce((sum, m) => sum + m.mastery_score, 0) / totalTopics 
      : 0;

    return {
      topics: masteryData || [],
      statistics: {
        total_topics: totalTopics,
        mastered_topics: masteredTopics,
        average_mastery: Math.round(averageMastery * 100) / 100,
        completion_percentage: totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0,
      },
    };
  }

  async getUserBadges(userId: string) {
    const { data: badges, error } = await this.supabase
      .from('user_badges')
      .select(`
        *,
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
      .limit(10);

    if (error) {
      return [];
    }

    return badges || [];
  }

async getLeaderboard(userId: string) {
  // Get top 50 users by XP
  const { data: leaderboard, error } = await this.supabase
    .from('user_profiles')
    .select(`
      user_id,
      display_name,
      avatar_url,
      total_xp,
      current_level,
      current_streak
    `)
    .order('total_xp', { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  // Add rank and mark current user
  const rankedLeaderboard = leaderboard?.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    is_current_user: entry.user_id === userId,
  })) || [];

  return rankedLeaderboard;
}

async updateStreak(userId: string) {
    const profile = await this.findById(userId);
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = profile.user_profiles?.[0]?.last_activity_date;
    
    if (!lastActivity) {
      // First activity
      await this.supabase
        .from('user_profiles')
        .update({
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
        })
        .eq('user_id', userId);
      return 1;
    }

    const lastDate = new Date(lastActivity);
    const todayDate = new Date(today);
    const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = profile.user_profiles[0].current_streak;
    
    if (daysDiff === 1) {
      // Consecutive day
      newStreak += 1;
    } else if (daysDiff > 1) {
      // Streak broken
      newStreak = 1;
    }
    // daysDiff === 0 means same day, no change

    const longestStreak = Math.max(
      profile.user_profiles[0].longest_streak,
      newStreak
    );

    await this.supabase
      .from('user_profiles')
      .update({
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_activity_date: today,
      })
      .eq('user_id', userId);

    return newStreak;
  }
}
