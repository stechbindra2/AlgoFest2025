import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { AiService } from './ai.service';

@Injectable()
export class QuestionGeneratorService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private aiService: AiService,
  ) {}

  async generateQuestion(
    topicId: string,
    difficulty: number,
    questionType: 'multiple_choice' | 'scenario' | 'story_based',
    grade: number
  ) {
    // Get topic context
    const { data: topic } = await this.supabase
      .from('topics')
      .select('name, description, learning_objectives')
      .eq('id', topicId)
      .single();

    if (!topic) {
      throw new Error('Topic not found');
    }

    // Build AI prompt based on question type and context
    const prompt = this.buildQuestionPrompt(topic, difficulty, questionType, grade);
    
    try {
      const aiResponse = await this.aiService.generateAdaptiveContent(prompt, {
        grade,
        difficulty,
        contentType: 'question_generation',
        topic: topic.name,
      });

      // Parse and validate AI response
      const questionData = this.parseQuestionResponse(aiResponse, questionType);
      
      // Store generated question in database
      const savedQuestion = await this.saveGeneratedQuestion(
        topicId,
        questionData,
        difficulty,
        questionType
      );

      return savedQuestion;
    } catch (error) {
      console.error('Question generation failed:', error);
      
      // Fallback to template-based generation
      return this.generateTemplateQuestion(topic, difficulty, questionType, grade);
    }
  }

  private buildQuestionPrompt(
    topic: any,
    difficulty: number,
    questionType: string,
    grade: number
  ): string {
    const difficultyDescriptor = this.getDifficultyDescriptor(difficulty);
    const questionTypeInstructions = this.getQuestionTypeInstructions(questionType);

    return `
Create a ${difficultyDescriptor} ${questionType.replace('_', ' ')} question for grade ${grade} students about "${topic.name}".

Topic Context:
- Name: ${topic.name}
- Description: ${topic.description}
- Learning Objectives: ${topic.learning_objectives?.join(', ') || 'Financial literacy fundamentals'}

Requirements:
1. Age-appropriate language for grade ${grade} (ages ${grade + 5}-${grade + 6})
2. Difficulty level: ${difficultyDescriptor} (${Math.round(difficulty * 100)}%)
3. Real-world scenarios that kids can relate to
4. Clear, unambiguous correct answer
5. Educational and engaging content

${questionTypeInstructions}

Format your response as valid JSON:
{
  "question_text": "The main question text",
  "question_data": {
    "type": "${questionType}",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Why this answer is correct"
  },
  "learning_objective": "What students learn from this question",
  "real_world_application": "How this applies to real life"
}
`;
  }

  private getQuestionTypeInstructions(questionType: string): string {
    switch (questionType) {
      case 'multiple_choice':
        return `
Multiple Choice Instructions:
- Provide exactly 4 answer options (A, B, C, D)
- Only one correct answer
- Make distractors plausible but clearly wrong
- Avoid "all of the above" or "none of the above"
`;
      
      case 'scenario':
        return `
Scenario Instructions:
- Create a realistic scenario a child might face
- Include specific dollar amounts or percentages
- Make the scenario relatable (allowance, toys, games, etc.)
- Require practical application of financial concepts
`;
      
      case 'story_based':
        return `
Story-Based Instructions:
- Create a short story with characters kids can relate to
- Include a financial decision or problem
- Make it engaging and age-appropriate
- Include specific details that affect the answer
`;
      
      default:
        return 'Create an engaging, educational question appropriate for the grade level.';
    }
  }

  private getDifficultyDescriptor(difficulty: number): string {
    if (difficulty <= 0.3) return 'easy';
    if (difficulty <= 0.6) return 'medium';
    return 'challenging';
  }

  private parseQuestionResponse(aiResponse: string, questionType: string): any {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(aiResponse);
      
      // Validate required fields
      if (!parsed.question_text || !parsed.question_data) {
        throw new Error('Invalid question format');
      }

      // Ensure correct answer format
      if (questionType === 'multiple_choice') {
        if (!parsed.question_data.options || parsed.question_data.options.length !== 4) {
          throw new Error('Multiple choice questions must have exactly 4 options');
        }
      }

      return parsed;
    } catch (error) {
      // If JSON parsing fails, try to extract content using regex
      return this.extractQuestionFromText(aiResponse, questionType);
    }
  }

  private extractQuestionFromText(text: string, questionType: string): any {
    // Fallback parsing logic for when AI doesn't return proper JSON
    const questionMatch = text.match(/(?:Question|Q):\s*(.+?)(?:\n|$)/i);
    const question_text = questionMatch ? questionMatch[1].trim() : 'Sample financial question';

    if (questionType === 'multiple_choice') {
      const optionMatches = text.match(/[A-D][.)]\s*(.+?)(?=\n[A-D][.)]|\n\n|\n$|$)/gi);
      const options = optionMatches?.map(opt => opt.replace(/^[A-D][.)\s]*/, '').trim()) || [
        'Save the money',
        'Spend it immediately',
        'Give it away',
        'Hide it under the bed'
      ];

      return {
        question_text,
        question_data: {
          type: questionType,
          options: options.slice(0, 4),
          correct_answer: options[0],
          explanation: 'This demonstrates good financial planning.'
        },
        learning_objective: 'Understanding basic financial decisions',
      };
    }

    return {
      question_text,
      question_data: {
        type: questionType,
        options: ['Good choice', 'Poor choice'],
        correct_answer: 'Good choice',
        explanation: 'This demonstrates financial literacy.'
      },
      learning_objective: 'Basic financial understanding',
    };
  }

  private async saveGeneratedQuestion(
    topicId: string,
    questionData: any,
    difficulty: number,
    questionType: string
  ) {
    const { data: question, error } = await this.supabase
      .from('questions')
      .insert({
        topic_id: topicId,
        question_type: questionType,
        difficulty_level: difficulty,
        question_text: questionData.question_text,
        question_data: questionData.question_data,
        explanation: questionData.question_data.explanation,
        learning_objective: questionData.learning_objective,
        estimated_time_seconds: this.estimateQuestionTime(questionData.question_text),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to save generated question');
    }

    return question;
  }

  private generateTemplateQuestion(
    topic: any,
    difficulty: number,
    questionType: string,
    grade: number
  ) {
    // Fallback template-based generation when AI fails
    const templates = this.getQuestionTemplates(topic.name, grade);
    const template = templates[questionType] || templates['multiple_choice'];
    
    return {
      topic_id: topic.id,
      question_type: questionType,
      difficulty_level: difficulty,
      question_text: template.question_text,
      question_data: template.question_data,
      explanation: template.explanation,
      learning_objective: template.learning_objective,
      estimated_time_seconds: 30,
      is_generated: false, // Mark as template-based
    };
  }

  private getQuestionTemplates(topicName: string, grade: number): any {
    const ageGroup = grade <= 4 ? 'elementary' : 'middle';
    
    return {
      multiple_choice: {
        question_text: `What is the smartest thing to do with money you receive for your birthday?`,
        question_data: {
          type: 'multiple_choice',
          options: [
            'Save some and spend some wisely',
            'Spend it all immediately on candy',
            'Give it all away',
            'Hide it and forget about it'
          ],
          correct_answer: 'Save some and spend some wisely',
          explanation: 'Balancing saving and spending helps you enjoy money now while planning for the future.'
        },
        learning_objective: 'Understanding balanced money management',
      },
      scenario: {
        question_text: `You have $20 allowance. You want a $15 toy and your friend's birthday party needs a $10 gift. What should you do?`,
        question_data: {
          type: 'multiple_choice',
          options: [
            'Save more money first, then buy both',
            'Buy the toy and skip the gift',
            'Buy the gift and skip the toy',
            'Borrow money from parents'
          ],
          correct_answer: 'Save more money first, then buy both',
          explanation: 'Planning ahead and saving helps you afford the things that matter most.'
        },
        learning_objective: 'Budget planning and prioritization',
      }
    };
  }

  private estimateQuestionTime(questionText: string): number {
    // Estimate reading and thinking time based on question complexity
    const wordCount = questionText.split(' ').length;
    const baseTime = 15; // Base 15 seconds
    const readingTime = Math.ceil(wordCount / 3); // ~3 words per second for kids
    const thinkingTime = 10; // 10 seconds thinking time
    
    return Math.min(60, baseTime + readingTime + thinkingTime); // Cap at 60 seconds
  }

  async generateBulkQuestions(topicId: string, count: number = 5) {
    const questions = [];
    const difficulties = [0.2, 0.4, 0.6, 0.8, 0.9]; // Range of difficulties
    const types = ['multiple_choice', 'scenario', 'story_based'];
    
    for (let i = 0; i < count; i++) {
      try {
        const difficulty = difficulties[i % difficulties.length];
        const questionType = types[i % types.length] as any;
        
        const question = await this.generateQuestion(topicId, difficulty, questionType, 5);
        questions.push(question);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to generate question ${i + 1}:`, error);
      }
    }
    
    return questions;
  }
}
