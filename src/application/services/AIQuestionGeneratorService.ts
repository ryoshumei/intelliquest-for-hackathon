import { Question } from '../../domain/survey/entities/Question';
import { AIGenerationParams } from '../use-cases/CreateSurveyUseCase';

/**
 * AI Question Generator Service Interface
 * Defines the contract for AI-powered question generation
 * Phase 3: Enhanced with dynamic question generation and context awareness
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
   * Phase 3: Generate dynamic questions based on previous answers
   * Core feature for adaptive surveys
   */
  generateDynamicQuestion(params: DynamicQuestionGenerationParams): Promise<Question>;

  /**
   * Phase 3: Generate multiple dynamic questions in context
   */
  generateDynamicQuestions(params: DynamicQuestionGenerationParams): Promise<Question[]>;

  /**
   * Phase 3: Analyze response patterns for question optimization
   */
  analyzeResponsePatterns(
    responses: SurveyResponse[],
    surveyGoal: string
  ): Promise<QuestionOptimizationSuggestion[]>;

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
 * Phase 3: Parameters for dynamic question generation
 */
export interface DynamicQuestionGenerationParams {
  surveyId: string;
  surveyGoal: string;
  previousAnswers: PreviousAnswer[];
  currentQuestionIndex: number;
  maxQuestions: number;
  targetLanguage?: string;
  questionCount?: number; // Number of questions to generate (default: 1)
}

/**
 * Phase 3: Previous answer interface for context
 */
export interface PreviousAnswer {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: any; // Can be string, number, array, etc.
  answeredAt: Date;
}

/**
 * Phase 3: Survey response interface for pattern analysis
 */
export interface SurveyResponse {
  responseId: string;
  surveyId: string;
  answers: PreviousAnswer[];
  completedAt?: Date;
  isComplete: boolean;
  userId?: string;
}

/**
 * Phase 3: Question optimization suggestion
 */
export interface QuestionOptimizationSuggestion {
  questionId: string;
  currentQuestion: string;
  suggestedQuestion: string;
  reasoning: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
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
 * Phase 3: Enhanced with dynamic question metrics
 */
export interface AIGenerationStats {
  totalRequests: number;
  successfulGenerations: number;
  dynamicQuestionGenerations: number; // Phase 3
  averageResponseTime: number;
  mostUsedTopics: string[];
  dynamicQuestionAccuracy: number; // Phase 3: Based on user engagement
} 