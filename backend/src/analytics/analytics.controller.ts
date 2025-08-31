import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('learning')
  @ApiOperation({ summary: 'Get comprehensive learning analytics for user' })
  @ApiResponse({ status: 200, description: 'Learning analytics returned' })
  async getLearningAnalytics(@User() user: any) {
    return this.analyticsService.getLearningAnalytics(user.sub);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics over time' })
  @ApiResponse({ status: 200, description: 'Performance metrics returned' })
  async getPerformanceMetrics(
    @User() user: any,
    @Query('timeframe') timeframe: string = 'week'
  ) {
    return this.analyticsService.getPerformanceMetrics(user.sub, timeframe);
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get engagement patterns and insights' })
  @ApiResponse({ status: 200, description: 'Engagement analytics returned' })
  async getEngagementAnalytics(@User() user: any) {
    return this.analyticsService.getEngagementAnalytics(user.sub);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized learning recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations returned' })
  async getRecommendations(@User() user: any) {
    return this.analyticsService.getPersonalizedRecommendations(user.sub);
  }
}
