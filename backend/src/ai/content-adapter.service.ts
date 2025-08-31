import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { AiService } from './ai.service';

interface AdaptationContext {
  userId: string;
  grade: number;
  currentMastery: number;
  learningStyle: string;
  engagementLevel: number;
  cognitiveLoad: number;
}

@Injectable()
export class ContentAdapterService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private aiService: AiService,
  ) {}

  async adaptContent(
    originalContent: string,
    targetDifficulty: number,
    context: AdaptationContext
  ): Promise<string> {
    try {
      // Analyze current content difficulty
      const currentDifficulty = await this.analyzeContentDifficulty(originalContent);
      
      // Determine adaptation strategy
      const adaptationStrategy = this.determineAdaptationStrategy(
        currentDifficulty,
        targetDifficulty,
        context
      );

      // Generate adapted content using AI
      const adaptedContent = await this.generateAdaptedContent(
        originalContent,
        adaptationStrategy,
        context
      );

      // Validate adaptation quality
      const isValid = await this.validateAdaptation(adaptedContent, targetDifficulty, context);
      
      return isValid ? adaptedContent : originalContent;
    } catch (error) {
      console.error('Content adaptation failed:', error);
      return originalContent; // Fallback to original content
    }
  }

  private async analyzeContentDifficulty(content: string): Promise<number> {
    // Simple heuristic-based difficulty analysis
    const factors = {
      wordCount: content.split(' ').length,
      avgWordLength: content.split(' ').reduce((sum, word) => sum + word.length, 0) / content.split(' ').length,
      sentenceCount: content.split(/[.!?]+/).length - 1,
      complexWords: content.split(' ').filter(word => word.length > 6).length,
      numericValues: (content.match(/\$?\d+(\.\d{2})?/g) || []).length,
    };

    // Calculate difficulty score (0.0 - 1.0)
    let difficulty = 0.3; // Base difficulty

    // Word count factor
    if (factors.wordCount > 50) difficulty += 0.2;
    if (factors.wordCount > 100) difficulty += 0.2;

    // Complex words factor
    if (factors.complexWords / factors.wordCount > 0.3) difficulty += 0.2;

    // Numeric complexity
    if (factors.numericValues > 3) difficulty += 0.1;

    return Math.min(1.0, difficulty);
  }

  private determineAdaptationStrategy(
    currentDifficulty: number,
    targetDifficulty: number,
    context: AdaptationContext
  ): string {
    const difficultyGap = targetDifficulty - currentDifficulty;

    if (Math.abs(difficultyGap) < 0.1) {
      return 'minor_adjustment';
    }

    if (difficultyGap > 0.3) {
      return 'significant_increase';
    }

    if (difficultyGap < -0.3) {
      return 'significant_decrease';
    }

    if (difficultyGap > 0) {
      return 'moderate_increase';
    } else {
      return 'moderate_decrease';
    }
  }

  private async generateAdaptedContent(
    originalContent: string,
    strategy: string,
    context: AdaptationContext
  ): Promise<string> {
    const prompt = this.buildAdaptationPrompt(originalContent, strategy, context);
    
    const adaptedContent = await this.aiService.generateAdaptiveContent(prompt, {
      grade: context.grade,
      contentType: 'content_adaptation',
      adaptation_strategy: strategy,
    });

    return adaptedContent;
  }

  private buildAdaptationPrompt(
    originalContent: string,
    strategy: string,
    context: AdaptationContext
  ): string {
    const strategyInstructions = this.getStrategyInstructions(strategy);
    const gradeInstructions = this.getGradeSpecificInstructions(context.grade);
    const learningStyleInstructions = this.getLearningStyleInstructions(context.learningStyle);

    return `
Adapt the following financial education content for a grade ${context.grade} student.

Original Content:
"${originalContent}"

Adaptation Strategy: ${strategy}
${strategyInstructions}

Student Context:
- Grade: ${context.grade}
- Current Mastery: ${Math.round(context.currentMastery * 100)}%
- Learning Style: ${context.learningStyle}
- Engagement Level: ${context.engagementLevel > 0.7 ? 'High' : context.engagementLevel > 0.4 ? 'Medium' : 'Low'}

${gradeInstructions}
${learningStyleInstructions}

Requirements:
1. Maintain the core learning objective
2. Use age-appropriate language and examples
3. Keep the content engaging and relatable
4. Include real-world scenarios kids understand
5. Maintain factual accuracy
6. Make it encouraging and positive

Return only the adapted content without additional commentary.
`;
  }

  private getStrategyInstructions(strategy: string): string {
    const instructions = {
      minor_adjustment: 'Make small tweaks to word choice and examples while keeping the same difficulty level.',
      
      moderate_increase: 'Increase complexity by adding more detailed explanations, introducing related concepts, or using slightly more advanced vocabulary.',
      
      significant_increase: 'Substantially increase difficulty by adding multi-step problems, advanced concepts, and requiring deeper analysis.',
      
      moderate_decrease: 'Simplify language, break down complex ideas into smaller steps, and use more basic examples.',
      
      significant_decrease: 'Greatly simplify the content using very basic language, concrete examples, and step-by-step explanations.',
    };

    return instructions[strategy] || instructions.minor_adjustment;
  }

  private getGradeSpecificInstructions(grade: number): string {
    if (grade <= 4) {
      return `
Grade ${grade} Instructions:
- Use simple sentences (5-10 words)
- Focus on concrete, tangible concepts
- Use familiar examples (toys, allowance, piggy banks)
- Include visual descriptions
- Avoid abstract financial terms
`;
    } else {
      return `
Grade ${grade} Instructions:
- Use moderate complexity sentences (10-15 words)
- Introduce basic financial terminology with explanations
- Use relevant examples (school supplies, savings goals, part-time jobs)
- Include some abstract concepts with concrete examples
- Begin introducing cause-and-effect relationships
`;
    }
  }

  private getLearningStyleInstructions(learningStyle: string): string {
    const styleInstructions = {
      visual: 'Include descriptions of visual elements, charts, or diagrams. Use metaphors and imagery.',
      auditory: 'Use rhythmic language, include dialogue, and create content suitable for reading aloud.',
      kinesthetic: 'Include hands-on activities, physical metaphors, and actionable steps.',
      reading: 'Focus on clear, well-structured text with logical flow and detailed explanations.',
    };

    return styleInstructions[learningStyle] || styleInstructions.reading;
  }

  private async validateAdaptation(
    adaptedContent: string,
    targetDifficulty: number,
    context: AdaptationContext
  ): Promise<boolean> {
    // Basic validation checks
    if (!adaptedContent || adaptedContent.length < 10) {
      return false;
    }

    // Check if content is appropriate for grade level
    const estimatedDifficulty = await this.analyzeContentDifficulty(adaptedContent);
    const difficultyGap = Math.abs(estimatedDifficulty - targetDifficulty);
    
    // Allow 20% tolerance in difficulty matching
    if (difficultyGap > 0.2) {
      console.warn(`Content adaptation difficulty gap too large: ${difficultyGap}`);
      return false;
    }

    // Check for inappropriate content
    const inappropriateWords = ['scary', 'dangerous', 'adult', 'complex', 'difficult'];
    const hasInappropriate = inappropriateWords.some(word => 
      adaptedContent.toLowerCase().includes(word)
    );

    return !hasInappropriate;
  }

  async adaptQuestionDifficulty(
    questionId: string,
    targetDifficulty: number,
    userId: string
  ) {
    // Get original question
    const { data: question } = await this.supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (!question) {
      throw new Error('Question not found');
    }

    // Get user context
    const { data: user } = await this.supabase
      .from('users')
      .select('grade')
      .eq('id', userId)
      .single();

    // Adapt question content
    const adaptedText = await this.adaptContent(
      question.question_text,
      targetDifficulty,
      {
        userId,
        grade: user?.grade || 5,
        currentMastery: 0.5, // Default mastery
        learningStyle: 'reading',
        engagementLevel: 0.5,
        cognitiveLoad: 0.5,
      }
    );

    // Create adapted question variant
    const { data: adaptedQuestion } = await this.supabase
      .from('questions')
      .insert({
        ...question,
        id: undefined, // Let DB generate new ID
        question_text: adaptedText,
        difficulty_level: targetDifficulty,
        created_at: new Date().toISOString(),
        is_adapted: true,
        original_question_id: questionId,
      })
      .select()
      .single();

    return adaptedQuestion;
  }

  async generatePersonalizedHint(
    questionId: string,
    userId: string,
    attemptHistory: any[]
  ): Promise<string> {
    // Get question context
    const { data: question } = await this.supabase
      .from('questions')
      .select('question_text, explanation, learning_objective')
      .eq('id', questionId)
      .single();

    if (!question) {
      return 'Think about what you learned in previous lessons!';
    }

    // Analyze attempt patterns
    const incorrectAttempts = attemptHistory.filter(a => !a.is_correct);
    const commonMistakes = this.analyzeCommonMistakes(incorrectAttempts);

    const prompt = `
Generate a helpful, encouraging hint for a student who is struggling with this question:

Question: "${question.question_text}"
Learning Objective: ${question.learning_objective}

Student's Previous Attempts: ${incorrectAttempts.length}
Common Mistake Patterns: ${commonMistakes.join(', ')}

Create a hint that:
1. Doesn't give away the answer
2. Guides thinking in the right direction
3. Is encouraging and positive
4. Uses age-appropriate language
5. Relates to real-world examples

Keep it to 1-2 sentences maximum.
`;

    try {
      const hint = await this.aiService.generateAdaptiveContent(prompt, {
        contentType: 'hint_generation',
        grade: 5,
      });

      return hint || 'Take your time and think about what you know about managing money!';
    } catch (error) {
      // Fallback hints
      const fallbackHints = [
        'Think about what you would do with your own money in this situation.',
        'Remember the difference between things you need and things you want.',
        'Consider what would help you save money for something important.',
        'Think about the smart money choices you\'ve learned about.',
      ];

      return fallbackHints[Math.floor(Math.random() * fallbackHints.length)];
    }
  }

  private analyzeCommonMistakes(attempts: any[]): string[] {
    // Simple pattern analysis for common mistakes
    const mistakes = [];
    
    if (attempts.length > 2) {
      mistakes.push('multiple_attempts');
    }
    
    if (attempts.some(a => a.time_taken_seconds < 5)) {
      mistakes.push('too_quick');
    }
    
    if (attempts.some(a => a.time_taken_seconds > 60)) {
      mistakes.push('overthinking');
    }
    
    return mistakes;
  }
}
