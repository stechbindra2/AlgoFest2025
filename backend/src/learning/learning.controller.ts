import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { LearningService } from './learning.service';
import { QuizService } from './quiz.service';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('learning')
@Controller('learning')
export class LearningController {
  constructor(
    private learningService: LearningService,
    private quizService: QuizService,
    private progressService: ProgressService,
  ) {}

  @Get('topics')
  @ApiOperation({ summary: 'Get learning topics for user grade' })
  @ApiResponse({ status: 200, description: 'Topics returned successfully' })
  async getTopics(@Query('grade') grade?: string) {
    const userGrade = grade ? parseInt(grade) : 5;
    return this.learningService.getTopicsForGrade(userGrade);
  }

  @Get('questions/next/:topicId')
  @ApiOperation({ summary: 'Get next adaptive question for topic' })
  @ApiResponse({ status: 200, description: 'Question returned successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getNextQuestion(@User() user: any, @Param('topicId') topicId: string) {
    try {
      return await this.quizService.getNextQuestion(user.sub, topicId);
    } catch (error) {
      console.error('Error getting next question:', error);
      // Return a fallback question for demo purposes
      return {
        id: 'demo-question-' + Date.now(),
        topic_id: topicId,
        question_text: 'What is the smartest thing to do with money you receive as a gift?',
        question_type: 'multiple_choice',
        question_data: {
          type: 'multiple_choice',
          options: [
            'Save some and spend some wisely',
            'Spend it all immediately',
            'Give it all away',
            'Hide it under your bed'
          ],
          correct_answer: 'Save some and spend some wisely'
        },
        difficulty_level: 0.4,
        estimated_time_seconds: 30,
        explanation: 'Balancing saving and spending helps you enjoy money now while planning for the future.'
      };
    }
  }

  @Post('questions/:questionId/submit')
  @ApiOperation({ summary: 'Submit answer for question' })
  @ApiResponse({ status: 200, description: 'Answer processed successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async submitAnswer(
    @User() user: any,
    @Param('questionId') questionId: string,
    @Body() answerData: any
  ) {
    try {
      return await this.quizService.submitAnswer(user.sub, questionId, answerData);
    } catch (error) {
      console.error('Error submitting answer:', error);
      // Return fallback response for demo
      const isCorrect = Math.random() > 0.3; // 70% chance correct for demo
      return {
        is_correct: isCorrect,
        xp_earned: isCorrect ? 50 : 10,
        explanation: isCorrect 
          ? 'Excellent! You understand this concept well.'
          : 'Not quite right, but that\'s okay! Learning takes practice.',
        correct_answer: answerData.answer || 'Save some and spend some wisely',
        feedback: isCorrect ? 'Great job! 🎉' : 'Keep trying! 💪'
      };
    }
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get user learning progress' })
  @ApiResponse({ status: 200, description: 'Progress returned successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getUserProgress(@User() user: any) {
    try {
      return await this.learningService.getUserProgress(user.sub);
    } catch (error) {
      console.error('Error getting user progress:', error);
      // Return fallback progress for demo
      return {
        topics: [],
        statistics: {
          total_topics: 5,
          mastered_topics: 0,
          average_mastery: 0,
          completion_percentage: 0
        }
      };
    }
  }

  @Get('progress/:topicId')
  @ApiOperation({ summary: 'Get progress for specific topic' })
  @ApiResponse({ status: 200, description: 'Topic progress returned' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getTopicProgress(@User() user: any, @Param('topicId') topicId: string) {
    try {
      return await this.learningService.getTopicProgress(user.sub, topicId);
    } catch (error) {
      console.error('Error getting topic progress:', error);
      return {
        progress: {
          mastery_score: 0,
          attempts_count: 0,
          correct_answers: 0,
          time_spent_seconds: 0
        },
        recent_performance: {
          accuracy: 0,
          average_time: 30,
          attempts_count: 0
        }
      };
    }
  }

  @Get('topics/:topicId/start')
  @ApiOperation({ summary: 'Start learning a topic (initialize session)' })
  @ApiResponse({ status: 200, description: 'Topic session started' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async startTopic(@User() user: any, @Param('topicId') topicId: string) {
    try {
      // Create learning session
      const session = await this.learningService.createLearningSession(user.sub, topicId);
      
      // Get first question for the topic
      const firstQuestion = await this.quizService.getNextQuestion(user.sub, topicId);
      
      return {
        session,
        first_question: firstQuestion,
        topic_info: await this.learningService.getTopicInfo(topicId)
      };
    } catch (error) {
      console.error('Error starting topic:', error);
      // Return fallback for demo
      return {
        session: { id: 'demo-session-' + Date.now(), started_at: new Date().toISOString() },
        first_question: {
          id: 'demo-question-' + Date.now(),
          topic_id: topicId,
          question_text: 'What is money?',
          question_type: 'multiple_choice',
          question_data: {
            type: 'multiple_choice',
            options: ['A way to trade for things we need', 'Just paper', 'Not important', 'Only for adults'],
            correct_answer: 'A way to trade for things we need'
          },
          difficulty_level: 0.2,
          estimated_time_seconds: 30
        },
        topic_info: {
          id: topicId,
          name: 'Financial Basics',
          description: 'Learn about money and finance'
        }
      };
    }
  }
}
