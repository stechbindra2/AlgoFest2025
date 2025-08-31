import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      baseURL: 'https://shash-m8b1ksoe-swedencentral.cognitiveservices.azure.com/openai/deployments/gpt-4o-2',
      defaultQuery: { 'api-version': '2024-12-01-preview' },
      defaultHeaders: {
        'api-key': this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      },
    });
  }

  // Main method for generating adaptive content
  private async _generateAdaptiveContent(prompt: string, context: any): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-2',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('AI Content Generation Error:', error);
      throw new Error('Failed to generate AI content');
    }
  }

  async generateQuestionExplanation(
    question: string,
    correctAnswer: string,
    userAnswer: string,
    isCorrect: boolean,
    difficulty: number,
    grade: number
  ): Promise<string> {
    const prompt = `
Generate a personalized explanation for a ${grade}th grade student.

Question: ${question}
Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}
Was Correct: ${isCorrect}
Difficulty Level: ${difficulty}

Requirements:
- Age-appropriate language for grade ${grade}
- Encouraging tone regardless of correctness
- Clear explanation of the concept
- Real-world example if helpful
- 2-3 sentences maximum
- Use emojis sparingly and appropriately
`;

    return this.generateAdaptiveContent(prompt, {
      grade,
      difficulty,
      isCorrect,
      contentType: 'explanation',
    });
  }

  async generateEngagementBoost(
    userId: string,
    context: {
      engagement_level: number;
      fatigue_detected: boolean;
      recent_performance: number;
      preferred_style: string;
      grade: number;
    }
  ): Promise<{
    content: string;
    type: 'story' | 'game' | 'celebration' | 'encouragement';
    duration_minutes: number;
  }> {
    let boostType: 'story' | 'game' | 'celebration' | 'encouragement';
    
    if (context.recent_performance > 0.8 && context.engagement_level > 0.7) {
      boostType = 'celebration';
    } else if (context.fatigue_detected || context.engagement_level < 0.4) {
      boostType = context.preferred_style === 'visual' ? 'story' : 'game';
    } else if (context.recent_performance < 0.5) {
      boostType = 'encouragement';
    } else {
      boostType = 'game';
    }

    const prompt = this.buildEngagementPrompt(boostType, context);
    const content = await this.generateAdaptiveContent(prompt, context);

    return {
      content,
      type: boostType,
      duration_minutes: boostType === 'story' ? 3 : boostType === 'game' ? 5 : 2,
    };
  }

  private buildSystemPrompt(context: any): string {
    return `
You are FinQuest AI, an expert educational content creator specializing in financial literacy for children aged 8-13.

Context:
- Grade Level: ${context.grade || 'Elementary'}
- Difficulty: ${context.difficulty || 'Medium'}
- Content Type: ${context.contentType || 'General'}
- User Engagement: ${context.engagement_level || 'Normal'}

Guidelines:
1. Use age-appropriate language and concepts
2. Make content engaging and relatable
3. Include real-world examples kids can understand
4. Be encouraging and positive
5. Keep explanations clear and concise
6. Use friendly, conversational tone
7. Avoid financial jargon unless explaining it simply
8. Include practical money management tips
9. Make learning fun and memorable
10. Consider cultural sensitivity and inclusivity

Remember: You're helping kids develop healthy money habits that will last a lifetime!
`;
  }

  private buildEngagementPrompt(
    type: 'story' | 'game' | 'celebration' | 'encouragement',
    context: any
  ): string {
    const basePrompts = {
      story: `
Create a short, engaging story (150-200 words) about a character learning financial concepts.
- Grade ${context.grade} reading level
- Include a relatable scenario about money management
- End with a positive lesson
- Use dialogue and descriptive language
- Make it interactive by asking "What would you do?"
`,
      game: `
Design a simple, fun mini-game concept related to financial literacy.
- Appropriate for grade ${context.grade}
- 2-3 minute activity
- Clear instructions
- Money management theme
- Engaging but educational
- Include scoring/reward mechanism
`,
      celebration: `
Create an enthusiastic celebration message for excellent performance.
- Congratulate specific achievements
- Highlight progress made
- Encourage continued learning
- Include fun facts about money/finance
- Use positive, energetic language
- Suggest next learning goals
`,
      encouragement: `
Write a supportive, motivating message for a struggling student.
- Acknowledge effort over perfection
- Provide gentle guidance
- Share relatable examples
- Boost confidence
- Suggest easier concepts to build success
- Remind them that learning takes time
`,
    };

    return basePrompts[type];
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if Azure OpenAI API key is configured
      const apiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY');
      if (!apiKey) {
        console.warn('Azure OpenAI API key not configured');
        return false;
      }

      // Test connection with a minimal request
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-2',
        messages: [
          {
            role: 'system',
            content: 'You are a health check service. Respond with "OK" if you can process this message.',
          },
          {
            role: 'user',
            content: 'Health check',
          },
        ],
        max_tokens: 10,
        temperature: 0,
      });

      // Check if we got a valid response
      const responseText = response.choices[0]?.message?.content?.toLowerCase();
      return responseText?.includes('ok') || responseText?.includes('health') || !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('Azure OpenAI health check failed:', error);
      
      // Check specific error types for better diagnostics
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('Network connectivity issue with Azure OpenAI');
      } else if (error.status === 401) {
        console.error('Authentication failed - check API key');
      } else if (error.status === 429) {
        console.error('Rate limit exceeded');
      } else if (error.status === 503) {
        console.error('Azure OpenAI service temporarily unavailable');
      }
      
      return false;
    }
  }

  async getServiceStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      api_configured: boolean;
      connection_test: boolean;
      last_check: string;
      error_message?: string;
    };
  }> {
    const apiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY');
    const apiConfigured = !!apiKey;
    
    let connectionTest = false;
    let errorMessage: string | undefined;
    
    try {
      connectionTest = await this.healthCheck();
    } catch (error) {
      errorMessage = error.message || 'Unknown error occurred';
    }
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (apiConfigured && connectionTest) {
      status = 'healthy';
    } else if (apiConfigured && !connectionTest) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      details: {
        api_configured: apiConfigured,
        connection_test: connectionTest,
        last_check: new Date().toISOString(),
        ...(errorMessage && { error_message: errorMessage }),
      },
    };
  }

  async generateFallbackContent(contentType: string, context: any): Promise<string> {
    // Fallback content generation when AI service is unavailable
    const fallbackContent = {
      explanation: "Great job! Understanding money concepts helps you make smart financial decisions. Keep practicing to become even better!",
      engagement_boost: "You're doing amazing! Take a moment to celebrate your progress. Learning about money is a superpower that will help you throughout your life!",
      question_generation: "What would you do if you found $5 on the playground?",
      content_adaptation: "Let's think about this step by step. First, consider what you already know about saving money..."
    };
    
    return fallbackContent[contentType] || fallbackContent.explanation;
  }

  // Enhanced content generation with fallback
  async generateAdaptiveContentWithFallback(prompt: string, context: any): Promise<string> {
    try {
      return await this.generateAdaptiveContent(prompt, context);
    } catch (error) {
      console.warn('AI content generation failed, using fallback:', error.message);
      return this.generateFallbackContent(context.contentType || 'explanation', context);
    }
  }

  async validateAIResponse(response: string, expectedType: string): Promise<boolean> {
    // Basic validation for AI-generated content
    if (!response || response.length < 10) return false;
    
    // Check for inappropriate content (basic filter)
    const inappropriateWords = ['scary', 'dangerous', 'adult-only', 'complicated'];
    const hasInappropriate = inappropriateWords.some(word => 
      response.toLowerCase().includes(word)
    );
    
    return !hasInappropriate;
  }

  // Rate limiting and retry logic
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors
        if (error.status === 401) {
          throw error;
        }
        
        // Don't retry on final attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`AI service attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Enhanced generateAdaptiveContent with retry logic
  async generateAdaptiveContent(prompt: string, context: any): Promise<string> {
    return this.retryWithBackoff(async () => {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-2',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '';
      
      // Validate the response
      if (!await this.validateAIResponse(content, context.contentType)) {
        throw new Error('Generated content failed validation');
      }
      
      return content;
    });
  }
}
