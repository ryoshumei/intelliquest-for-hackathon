import { Question } from '../../domain/survey/entities/Question';
import { AIGenerationParams } from '../use-cases/CreateSurveyUseCase';

/**
 * AI Question Generator Service Interface
 * Defines the contract for AI-powered question generation
 * Implementation will be provided by the infrastructure layer
 */
export interface AIQuestionGeneratorService {
  /**
   * Generate questions using AI based on parameters
   */
  generateQuestions(params: AIGenerationParams): Promise<Question[]>;

  /**
   * Improve existing questions using AI
   */
  improveQuestions(questions: Question[], context: string): Promise<Question[]>;

  /**
   * Generate follow-up questions based on existing survey
   */
  generateFollowUpQuestions(
    existingQuestions: Question[],
    topic: string,
    count: number
  ): Promise<Question[]>;

  /**
   * Validate AI service availability
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get supported question types for AI generation
   */
  getSupportedQuestionTypes(): string[];
}

/**
 * AI Question Generation Result
 */
export interface AIQuestionResult {
  question: Question;
  confidence: number;
  reasoning?: string;
}

/**
 * AI Service Configuration
 */
export interface AIServiceConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

/**
 * AI Generation Statistics
 */
export interface AIGenerationStats {
  totalRequests: number;
  successfulGenerations: number;
  averageResponseTime: number;
  mostUsedTopics: string[];
} 