import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { GamificationService } from './gamification.service';
import { BadgeService } from './badge.service';
import { LeaderboardService } from './leaderboard.service';
import { StreakService } from './streak.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('gamification')
@Controller('gamification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GamificationController {
  constructor(
    private gamificationService: GamificationService,
    private badgeService: BadgeService,
    private leaderboardService: LeaderboardService,
    private streakService: StreakService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get user gamification status' })
  @ApiResponse({ status: 200, description: 'Gamification status returned' })
  async getGamificationStatus(@User() user: any) {
    return this.gamificationService.getGamificationStatus(user.sub);
  }

  @Post('xp/add')
  @ApiOperation({ summary: 'Add XP to user account' })
  @ApiResponse({ status: 200, description: 'XP added successfully' })
  async addXP(
    @User() user: any,
    @Body() xpData: { amount: number; reason?: string }
  ) {
    return this.gamificationService.addXP(user.sub, xpData.amount);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Get user badges' })
  @ApiResponse({ status: 200, description: 'User badges returned' })
  async getUserBadges(@User() user: any) {
    return this.badgeService.getRecentBadges(user.sub);
  }

  @Get('badges/progress')
  @ApiOperation({ summary: 'Get badge progress for user' })
  @ApiResponse({ status: 200, description: 'Badge progress returned' })
  async getBadgeProgress(@User() user: any) {
    return this.badgeService.getBadgeProgress(user.sub);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard data' })
  @ApiResponse({ status: 200, description: 'Leaderboard returned' })
  async getLeaderboard(
    @User() user: any,
    @Query('type') type: string = 'global',
    @Query('timeframe') timeframe: string = 'all_time',
    @Query('limit') limit: string = '50'
  ) {
    return this.leaderboardService.getLeaderboard(
      user.sub,
      type,
      timeframe,
      parseInt(limit)
    );
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get user streak information' })
  @ApiResponse({ status: 200, description: 'Streak information returned' })
  async getStreakInfo(@User() user: any) {
    return this.streakService.getStreakInfo(user.sub);
  }

  @Post('streak/update')
  @ApiOperation({ summary: 'Update daily streak' })
  @ApiResponse({ status: 200, description: 'Streak updated successfully' })
  async updateStreak(@User() user: any) {
    return this.streakService.updateDailyStreak(user.sub);
  }

  @Get('engagement/boost')
  @ApiOperation({ summary: 'Check if engagement boost is needed' })
  @ApiResponse({ status: 200, description: 'Engagement recommendation returned' })
  async checkEngagementBoost(@User() user: any) {
    return this.gamificationService.calculateEngagementBoost(user.sub);
  }

  @Get('achievements/recent')
  @ApiOperation({ summary: 'Get recent achievements' })
  @ApiResponse({ status: 200, description: 'Recent achievements returned' })
  async getRecentAchievements(@User() user: any) {
    const badges = await this.badgeService.getRecentBadges(user.sub, 5);
    const streakInfo = await this.streakService.getStreakInfo(user.sub);
    
    return {
      recent_badges: badges,
      current_streak: streakInfo.current,
      streak_milestone: streakInfo.current % 7 === 0 && streakInfo.current > 0,
    };
  }
}
