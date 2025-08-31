import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class LeaderboardService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  async getLeaderboard(
    userId: string,
    type: string = 'global',
    timeframe: string = 'all_time',
    limit: number = 50
  ) {
    let query = this.supabase
      .from('user_profiles')
      .select(`
        user_id,
        display_name,
        avatar_url,
        total_xp,
        current_level,
        current_streak,
        users!inner (
          role,
          grade,
          created_at
        )
      `)
      .eq('users.role', 'student')
      .order('total_xp', { ascending: false })
      .limit(limit);

    // Apply filters based on type
    if (type === 'grade') {
      const { data: userInfo } = await this.supabase
        .from('users')
        .select('grade')
        .eq('id', userId)
        .single();
      
      if (userInfo?.grade) {
        query = query.eq('users.grade', userInfo.grade);
      }
    }

    // Apply timeframe filters
    if (timeframe !== 'all_time') {
      const dateFilter = this.getDateFilter(timeframe);
      if (dateFilter) {
        query = query.gte('users.created_at', dateFilter);
      }
    }

    const { data: leaderboard, error } = await query;

    if (error) {
      throw new Error('Failed to fetch leaderboard');
    }

    // Add rank and highlight current user
    const rankedLeaderboard = leaderboard?.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      is_current_user: entry.user_id === userId,
      xp_display: this.formatXP(entry.total_xp),
    })) || [];

    // Find current user's position if not in top results
    let currentUserRank = null;
    const currentUserEntry = rankedLeaderboard.find(entry => entry.is_current_user);
    
    if (!currentUserEntry) {
      currentUserRank = await this.getCurrentUserRank(userId, type, timeframe);
    }

    return {
      leaderboard: rankedLeaderboard,
      user_rank: currentUserEntry?.rank || currentUserRank,
      total_participants: await this.getTotalParticipants(type),
      type,
      timeframe,
      last_updated: new Date().toISOString(),
    };
  }

  async getClassroomLeaderboard(classroomId: string, userId: string) {
    const { data: leaderboard, error } = await this.supabase
      .from('classroom_students')
      .select(`
        student_id,
        user_profiles!inner (
          display_name,
          avatar_url,
          total_xp,
          current_level,
          current_streak
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('user_profiles.total_xp', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch classroom leaderboard');
    }

    return leaderboard?.map((entry, index) => ({
      user_id: entry.student_id,
      ...entry.user_profiles,
      rank: index + 1,
      is_current_user: entry.student_id === userId,
    })) || [];
  }

  async updateLeaderboardCache(type: string, timeframe: string = 'all_time') {
    // Get top performers for caching
    const { data: topPerformers } = await this.supabase
      .from('user_profiles')
      .select(`
        user_id,
        display_name,
        total_xp,
        current_level,
        users!inner (role, grade)
      `)
      .eq('users.role', 'student')
      .order('total_xp', { ascending: false })
      .limit(100);

    if (!topPerformers) return;

    // Cache leaderboard entries
    const leaderboardEntries = topPerformers.map((user, index) => ({
      user_id: user.user_id,
      rank_position: index + 1,
      score: user.total_xp,
      metric_type: 'total_xp',
      calculated_at: new Date().toISOString(),
    }));

    // Find or create leaderboard
    let { data: leaderboard } = await this.supabase
      .from('leaderboards')
      .select('id')
      .eq('type', type)
      .eq('timeframe', timeframe)
      .single();

    if (!leaderboard) {
      const { data: newLeaderboard } = await this.supabase
        .from('leaderboards')
        .insert({ type, timeframe })
        .select('id')
        .single();
      
      leaderboard = newLeaderboard;
    }

    if (leaderboard) {
      // Clear old entries
      await this.supabase
        .from('leaderboard_entries')
        .delete()
        .eq('leaderboard_id', leaderboard.id);

      // Insert new entries
      await this.supabase
        .from('leaderboard_entries')
        .insert(
          leaderboardEntries.map(entry => ({
            ...entry,
            leaderboard_id: leaderboard.id,
          }))
        );
    }
  }

  async getTopPerformers(limit: number = 10, grade?: number) {
    let query = this.supabase
      .from('user_profiles')
      .select(`
        user_id,
        display_name,
        avatar_url,
        total_xp,
        current_level,
        current_streak,
        users!inner (grade)
      `)
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (grade) {
      query = query.eq('users.grade', grade);
    }

    const { data: performers, error } = await query;

    if (error) {
      throw new Error('Failed to fetch top performers');
    }

    return performers?.map((performer, index) => ({
      ...performer,
      rank: index + 1,
      achievement_level: this.getAchievementLevel(performer.total_xp),
    })) || [];
  }

  async getWeeklyLeaderboard(userId: string) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // For weekly leaderboard, we'd need to track weekly XP gains
    // For now, return monthly active users by XP
    const { data: weeklyStats, error } = await this.supabase
      .from('learning_sessions')
      .select(`
        user_id,
        xp_earned,
        user_profiles!inner (
          display_name,
          avatar_url,
          current_level
        )
      `)
      .gte('started_at', weekStart.toISOString())
      .order('xp_earned', { ascending: false })
      .limit(50);

    if (error) {
      return [];
    }

    // Aggregate XP by user
    const userXP = new Map();
    weeklyStats?.forEach(session => {
      const current = userXP.get(session.user_id) || {
        user_id: session.user_id,
        weekly_xp: 0,
        ...session.user_profiles,
      };
      current.weekly_xp += session.xp_earned || 0;
      userXP.set(session.user_id, current);
    });

    const weeklyLeaderboard = Array.from(userXP.values())
      .sort((a, b) => b.weekly_xp - a.weekly_xp)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        is_current_user: entry.user_id === userId,
      }));

    return weeklyLeaderboard;
  }

  private async getCurrentUserRank(
    userId: string,
    type: string,
    timeframe: string
  ): Promise<number | null> {
    const { data: userProfile } = await this.supabase
      .from('user_profiles')
      .select('total_xp')
      .eq('user_id', userId)
      .single();

    if (!userProfile) return null;

    const { count } = await this.supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gt('total_xp', userProfile.total_xp);

    return (count || 0) + 1;
  }

  private async getTotalParticipants(type: string): Promise<number> {
    const { count } = await this.supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gt('total_xp', 0);

    return count || 0;
  }

  private getDateFilter(timeframe: string): string | null {
    const now = new Date();
    
    switch (timeframe) {
      case 'daily':
        now.setHours(0, 0, 0, 0);
        return now.toISOString();
      case 'weekly':
        now.setDate(now.getDate() - 7);
        return now.toISOString();
      case 'monthly':
        now.setMonth(now.getMonth() - 1);
        return now.toISOString();
      default:
        return null;
    }
  }

  private formatXP(xp: number): string {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M`;
    }
    if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
  }

  private getAchievementLevel(xp: number): string {
    if (xp >= 10000) return 'Master';
    if (xp >= 5000) return 'Expert';
    if (xp >= 2000) return 'Advanced';
    if (xp >= 500) return 'Intermediate';
    return 'Beginner';
  }
}
