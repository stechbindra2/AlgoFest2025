import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AiService } from './ai.service';
import { QuestionGeneratorService } from './question-generator.service';
import { ContentAdapterService } from './content-adapter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(
    private aiService: AiService,
    private questionGenerator: QuestionGeneratorService,
    private contentAdapter: ContentAdapterService,
  ) {}

  @Post('generate/explanation')
  @ApiOperation({ summary: 'Generate AI-powered explanation for incorrect answers' })
  @ApiResponse({ status: 200, description: 'Explanation generated successfully' })
  async generateExplanation(
    @User() user: any,
    @Body() requestData: {
      question: string;
      correctAnswer: string;
      userAnswer: string;
      isCorrect: boolean;
      difficulty: number;
      topicId: string;
    }
  ) {
    const explanation = await this.aiService.generateQuestionExplanation(
      requestData.question,
      requestData.correctAnswer,
      requestData.userAnswer,
      requestData.isCorrect,
      requestData.difficulty,
      user.grade || 5
    );

    return {
      explanation,
      personalized: true,
      grade_appropriate: true,
    };
  }

  @Post('generate/engagement-boost')
  @ApiOperation({ summary: 'Generate engagement boost content based on user state' })
  @ApiResponse({ status: 200, description: 'Engagement content generated' })
  async generateEngagementBoost(
    @User() user: any,
    @Body() context: {
      engagement_level: number;
      fatigue_detected: boolean;
      recent_performance: number;
      preferred_style: string;
    }
  ) {
    const engagementContent = await this.aiService.generateEngagementBoost(
      user.sub,
      {
        ...context,
        grade: user.grade || 5,
      }
    );

    return engagementContent;
  }

  @Post('generate/question')
  @ApiOperation({ summary: 'Generate new question using AI' })
  @ApiResponse({ status: 200, description: 'Question generated successfully' })
  async generateQuestion(
    @Body() requestData: {
      topicId: string;
      difficulty: number;
      questionType: 'multiple_choice' | 'scenario' | 'story_based';
      grade: number;
    }
  ) {
    const question = await this.questionGenerator.generateQuestion(
      requestData.topicId,
      requestData.difficulty,
      requestData.questionType,
      requestData.grade
    );

    return question;
  }

  @Post('adapt/content')
  @ApiOperation({ summary: 'Adapt existing content to user context' })
  @ApiResponse({ status: 200, description: 'Content adapted successfully' })
  async adaptContent(
    @User() user: any,
    @Body() requestData: {
      originalContent: string;
      targetDifficulty: number;
      userContext: any;
    }
  ) {
    const adaptedContent = await this.contentAdapter.adaptContent(
      requestData.originalContent,
      requestData.targetDifficulty,
      {
        ...requestData.userContext,
        userId: user.sub,
        grade: user.grade,
      }
    );

    return {
      adapted_content: adaptedContent,
      adaptation_reason: 'Personalized for user context',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI service health' })
  @ApiResponse({ status: 200, description: 'AI service status' })
  async healthCheck() {
    const serviceStatus = await this.aiService.getServiceStatus();
    
    return {
      ...serviceStatus,
      features_available: {
        question_generation: serviceStatus.status !== 'unhealthy',
        content_adaptation: serviceStatus.status !== 'unhealthy',
        explanation_generation: serviceStatus.status !== 'unhealthy',
        engagement_boost: serviceStatus.status !== 'unhealthy',
        fallback_mode: serviceStatus.status === 'degraded',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status/detailed')
  @ApiOperation({ summary: 'Get detailed AI service diagnostics' })
  @ApiResponse({ status: 200, description: 'Detailed service status' })
  async getDetailedStatus() {
    const serviceStatus = await this.aiService.getServiceStatus();
    const isHealthy = await this.aiService.healthCheck();
    
    return {
      service_name: 'FinQuest AI Service',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      azure_openai: {
        configured: serviceStatus.details.api_configured,
        connection_healthy: serviceStatus.details.connection_test,
        endpoint: 'https://shash-m8b1ksoe-swedencentral.cognitiveservices.azure.com/',
        model: 'gpt-4o-2',
        api_version: '2024-12-01-preview',
      },
      capabilities: {
        dynamic_question_generation: isHealthy,
        adaptive_content_creation: isHealthy,
        personalized_explanations: isHealthy,
        engagement_optimization: isHealthy,
        fallback_content: true, // Always available
      },
      performance: {
        last_health_check: serviceStatus.details.last_check,
        fallback_mode_active: serviceStatus.status === 'degraded',
      },
      ...(serviceStatus.details.error_message && {
        error_details: serviceStatus.details.error_message
      }),
    };
  }
}
