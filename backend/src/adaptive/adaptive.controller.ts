import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AdaptiveService } from './adaptive.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('adaptive')
@Controller('adaptive')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdaptiveController {
  constructor(private adaptiveService: AdaptiveService) {}

  @Get('recommend/:topicId')
  @ApiOperation({ summary: 'Get adaptive question recommendation' })
  @ApiResponse({ status: 200, description: 'Question recommendation returned' })
  async getQuestionRecommendation(
    @User() user: any,
    @Param('topicId') topicId: string,
  ) {
    return this.adaptiveService.getQuestionRecommendation(user.sub, topicId);
  }

  @Post('feedback/:topicId')
  @ApiOperation({ summary: 'Submit learning feedback for adaptation' })
  @ApiResponse({ status: 200, description: 'Feedback processed successfully' })
  async submitFeedback(
    @User() user: any,
    @Param('topicId') topicId: string,
    @Body() feedbackData: any,
  ) {
    return this.adaptiveService.processFeedback(user.sub, topicId, feedbackData);
  }

  @Get('mastery/:topicId/insights')
  @ApiOperation({ summary: 'Get mastery insights for a topic' })
  @ApiResponse({ status: 200, description: 'Mastery insights returned' })
  async getMasteryInsights(
    @User() user: any,
    @Param('topicId') topicId: string,
  ) {
    return this.adaptiveService.getMasteryInsights(user.sub, topicId);
  }

  @Get('engagement/status')
  @ApiOperation({ summary: 'Get current engagement status and recommendations' })
  @ApiResponse({ status: 200, description: 'Engagement status returned' })
  async getEngagementStatus(@User() user: any) {
    return this.adaptiveService.getEngagementStatus(user.sub);
  }
}
