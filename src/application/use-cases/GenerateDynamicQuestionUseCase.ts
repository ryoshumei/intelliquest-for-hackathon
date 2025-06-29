import { Question } from '../../domain/survey/entities/Question';
import { SurveyRepository } from '../../domain/survey/repositories/SurveyRepository';
import { SurveyId } from '../../domain/survey/value-objects/SurveyId';
import { 
  AIQuestionGeneratorService,
  DynamicQuestionGenerationParams,
  PreviousAnswer
} from '../services/AIQuestionGeneratorService';

/**
 * Generate Dynamic Question Use Case
 * Phase 3: Core use case for adaptive survey questions
 */
export class GenerateDynamicQuestionUseCase {
  constructor(
    private surveyRepository: SurveyRepository,
    private aiQuestionGenerator: AIQuestionGeneratorService
  ) {}

  /**
   * Generate a single dynamic question based on context
   */
  async execute(params: GenerateDynamicQuestionRequest): Promise<GenerateDynamicQuestionResponse> {
    try {
      // 1. Validate request
      this.validateRequest(params);

      // 2. Retrieve survey
      const survey = await this.surveyRepository.findByIdString(params.surveyId);
      if (!survey) {
        throw new Error(`Survey not found: ${params.surveyId}`);
      }

      // 3. Check if survey can generate dynamic questions
      if (!survey.canGenerateDynamicQuestions()) {
        throw new Error('Survey cannot generate dynamic questions. Check goal and question limits.');
      }

      // 4. Prepare AI generation parameters
      const generationParams: DynamicQuestionGenerationParams = {
        surveyId: params.surveyId,
        surveyGoal: survey.getGoal(),
        previousAnswers: params.previousAnswers,
        currentQuestionIndex: params.currentQuestionIndex,
        maxQuestions: survey.getMaxQuestions(),
        targetLanguage: survey.getTargetLanguage(),
        questionCount: 1
      };

      // 5. Generate dynamic question using AI
      const dynamicQuestion = await this.aiQuestionGenerator.generateDynamicQuestion(generationParams);

      // 6. Add dynamic question to survey
      survey.addDynamicQuestion(dynamicQuestion);

      // 7. Save updated survey
      await this.surveyRepository.save(survey);

      // 8. Return response
      return {
        success: true,
        question: dynamicQuestion,
        surveyId: params.surveyId,
        totalQuestions: survey.getTotalQuestionCount(),
        canGenerateMore: survey.canGenerateDynamicQuestions()
      };

    } catch (error) {
      console.error('Error generating dynamic question:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        surveyId: params.surveyId,
        totalQuestions: 0,
        canGenerateMore: false
      };
    }
  }

  /**
   * Generate multiple dynamic questions at once
   */
  async executeMultiple(params: GenerateMultipleDynamicQuestionsRequest): Promise<GenerateMultipleDynamicQuestionsResponse> {
    try {
      // 1. Validate request
      this.validateMultipleRequest(params);

      // 2. Retrieve survey
      const survey = await this.surveyRepository.findByIdString(params.surveyId);
      if (!survey) {
        throw new Error(`Survey not found: ${params.surveyId}`);
      }

      // 3. Check if survey can generate dynamic questions
      if (!survey.canGenerateDynamicQuestions()) {
        throw new Error('Survey cannot generate dynamic questions. Check goal and question limits.');
      }

      // 4. Calculate how many questions we can generate
      const currentTotal = survey.getTotalQuestionCount();
      const maxQuestions = survey.getMaxQuestions();
      const requestedCount = params.questionCount;
      const availableSlots = maxQuestions - currentTotal;
      const questionsToGenerate = Math.min(requestedCount, availableSlots);

      if (questionsToGenerate === 0) {
        throw new Error('Cannot generate more questions. Survey has reached maximum limit.');
      }

      // 5. Prepare AI generation parameters
      const generationParams: DynamicQuestionGenerationParams = {
        surveyId: params.surveyId,
        surveyGoal: survey.getGoal(),
        previousAnswers: params.previousAnswers,
        currentQuestionIndex: params.currentQuestionIndex,
        maxQuestions: survey.getMaxQuestions(),
        targetLanguage: survey.getTargetLanguage(),
        questionCount: questionsToGenerate
      };

      // 6. Generate dynamic questions using AI
      const dynamicQuestions = await this.aiQuestionGenerator.generateDynamicQuestions(generationParams);

      // 7. Add dynamic questions to survey
      const addedQuestions: Question[] = [];
      for (const question of dynamicQuestions) {
        if (survey.canGenerateDynamicQuestions()) {
          survey.addDynamicQuestion(question);
          addedQuestions.push(question);
        }
      }

      // 8. Save updated survey
      await this.surveyRepository.save(survey);

      // 9. Return response
      return {
        success: true,
        questions: addedQuestions,
        surveyId: params.surveyId,
        totalQuestions: survey.getTotalQuestionCount(),
        requestedCount: requestedCount,
        generatedCount: addedQuestions.length,
        canGenerateMore: survey.canGenerateDynamicQuestions()
      };

    } catch (error) {
      console.error('Error generating multiple dynamic questions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        questions: [],
        surveyId: params.surveyId,
        totalQuestions: 0,
        requestedCount: params.questionCount,
        generatedCount: 0,
        canGenerateMore: false
      };
    }
  }

  /**
   * Regenerate dynamic questions based on updated context
   */
  async regenerateDynamicQuestions(params: RegenerateDynamicQuestionsRequest): Promise<RegenerateDynamicQuestionsResponse> {
    try {
      // 1. Validate request
      this.validateRegenerateRequest(params);

      // 2. Retrieve survey
      const survey = await this.surveyRepository.findByIdString(params.surveyId);
      if (!survey) {
        throw new Error(`Survey not found: ${params.surveyId}`);
      }

      // 3. Clear existing dynamic questions
      const previousDynamicCount = survey.getDynamicQuestions().length;
      survey.clearDynamicQuestions();

      // 4. Generate new dynamic questions
      const multipleParams: GenerateMultipleDynamicQuestionsRequest = {
        surveyId: params.surveyId,
        previousAnswers: params.updatedAnswers,
        currentQuestionIndex: params.currentQuestionIndex,
        questionCount: params.desiredCount || previousDynamicCount
      };

      const result = await this.executeMultiple(multipleParams);

      return {
        success: result.success,
        questions: result.questions,
        surveyId: params.surveyId,
        previousDynamicCount,
        newDynamicCount: result.generatedCount,
        error: result.error
      };

    } catch (error) {
      console.error('Error regenerating dynamic questions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        questions: [],
        surveyId: params.surveyId,
        previousDynamicCount: 0,
        newDynamicCount: 0
      };
    }
  }

  // Private validation methods

  private validateRequest(params: GenerateDynamicQuestionRequest): void {
    if (!params.surveyId) {
      throw new Error('Survey ID is required');
    }
    if (!Array.isArray(params.previousAnswers)) {
      throw new Error('Previous answers must be an array');
    }
    if (typeof params.currentQuestionIndex !== 'number' || params.currentQuestionIndex < 0) {
      throw new Error('Current question index must be a non-negative number');
    }
  }

  private validateMultipleRequest(params: GenerateMultipleDynamicQuestionsRequest): void {
    this.validateRequest(params);
    if (typeof params.questionCount !== 'number' || params.questionCount < 1) {
      throw new Error('Question count must be a positive number');
    }
    if (params.questionCount > 10) {
      throw new Error('Cannot generate more than 10 questions at once');
    }
  }

  private validateRegenerateRequest(params: RegenerateDynamicQuestionsRequest): void {
    if (!params.surveyId) {
      throw new Error('Survey ID is required');
    }
    if (!Array.isArray(params.updatedAnswers)) {
      throw new Error('Updated answers must be an array');
    }
    if (typeof params.currentQuestionIndex !== 'number' || params.currentQuestionIndex < 0) {
      throw new Error('Current question index must be a non-negative number');
    }
    if (params.desiredCount !== undefined && (typeof params.desiredCount !== 'number' || params.desiredCount < 0)) {
      throw new Error('Desired count must be a non-negative number');
    }
  }
}

/**
 * Request interfaces
 */
export interface GenerateDynamicQuestionRequest {
  surveyId: string;
  previousAnswers: PreviousAnswer[];
  currentQuestionIndex: number;
}

export interface GenerateMultipleDynamicQuestionsRequest extends GenerateDynamicQuestionRequest {
  questionCount: number;
}

export interface RegenerateDynamicQuestionsRequest {
  surveyId: string;
  updatedAnswers: PreviousAnswer[];
  currentQuestionIndex: number;
  desiredCount?: number; // If not provided, will use previous dynamic question count
}

/**
 * Response interfaces
 */
export interface GenerateDynamicQuestionResponse {
  success: boolean;
  question?: Question;
  surveyId: string;
  totalQuestions: number;
  canGenerateMore: boolean;
  error?: string;
}

export interface GenerateMultipleDynamicQuestionsResponse {
  success: boolean;
  questions: Question[];
  surveyId: string;
  totalQuestions: number;
  requestedCount: number;
  generatedCount: number;
  canGenerateMore: boolean;
  error?: string;
}

export interface RegenerateDynamicQuestionsResponse {
  success: boolean;
  questions: Question[];
  surveyId: string;
  previousDynamicCount: number;
  newDynamicCount: number;
  error?: string;
} 