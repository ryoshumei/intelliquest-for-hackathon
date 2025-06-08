import { Survey } from '../../domain/survey/entities/Survey';
import { Question } from '../../domain/survey/entities/Question';
import { QuestionType } from '../../domain/survey/value-objects/QuestionType';
import { SurveyRepository } from '../../domain/survey/repositories/SurveyRepository';
import { AIQuestionGeneratorService } from '../services/AIQuestionGeneratorService';
import { EventBus } from '../services/EventBus';
import { DomainError } from '../../domain/shared/errors/DomainError';

/**
 * Create Survey Use Case - Core business logic for survey creation
 */
export class CreateSurveyUseCase {
  constructor(
    private readonly surveyRepository: SurveyRepository,
    private readonly aiService: AIQuestionGeneratorService,
    private readonly eventBus: EventBus
  ) {}

  async execute(request: CreateSurveyRequest): Promise<CreateSurveyResponse> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Create survey entity
      const survey = Survey.create(request.title, request.description);

      // 3. Add manual questions if provided
      if (request.questions) {
        request.questions.forEach(questionData => {
          const questionType = QuestionType.fromString(questionData.type);
          const question = Question.create(
            questionData.text,
            questionType,
            questionData.options,
            questionData.isRequired
          );
          survey.addQuestion(question);
        });
      }

      // 4. Generate AI questions if requested
      if (request.useAI && request.aiGenerationParams) {
        const aiQuestions = await this.generateAIQuestions(
          request.aiGenerationParams,
          survey.getQuestionCount()
        );
        
        aiQuestions.forEach(question => survey.addQuestion(question));
      }

      // 5. Save survey
      const savedSurvey = await this.surveyRepository.save(survey);

      // 6. Publish domain events
      const domainEvents = savedSurvey.getDomainEvents();
      for (const event of domainEvents) {
        await this.eventBus.publish(event);
      }
      savedSurvey.clearDomainEvents();

      // 7. Return response
      return this.createResponse(savedSurvey);

    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new Error(`Failed to create survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateRequest(request: CreateSurveyRequest): void {
    if (!request.title?.trim()) {
      throw DomainError.validation('Survey title is required');
    }

    if (request.useAI && !request.aiGenerationParams) {
      throw DomainError.validation('AI generation parameters are required when useAI is true');
    }

    if (request.useAI && request.aiGenerationParams) {
      const params = request.aiGenerationParams;
      if (!params.topic?.trim()) {
        throw DomainError.validation('AI generation topic is required');
      }
      if (params.questionCount <= 0 || params.questionCount > 20) {
        throw DomainError.validation('AI question count must be between 1 and 20');
      }
    }
  }

  private async generateAIQuestions(
    params: AIGenerationParams,
    existingQuestionCount: number
  ): Promise<Question[]> {
    // Check if we would exceed the survey question limit
    const totalQuestions = existingQuestionCount + params.questionCount;
    if (totalQuestions > 50) {
      throw DomainError.businessRule(
        `Survey would exceed maximum questions limit (${totalQuestions}/50)`
      );
    }

    try {
      return await this.aiService.generateQuestions(params);
    } catch (error) {
      throw new Error(`AI question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createResponse(survey: Survey): CreateSurveyResponse {
    return {
      id: survey.getId(),
      title: survey.getTitle(),
      description: survey.getDescription(),
      questionCount: survey.getQuestionCount(),
      questions: survey.getQuestions().map(q => ({
        id: q.getId(),
        text: q.getText(),
        type: q.getType().toString(),
        options: q.getOptions(),
        isRequired: q.getIsRequired(),
        isAIGenerated: q.getIsAIGenerated()
      })),
      isActive: survey.getIsActive(),
      createdAt: survey.getCreatedAt(),
      canBePublished: survey.canBePublished()
    };
  }
}

/**
 * Request DTO for creating a survey
 */
export interface CreateSurveyRequest {
  title: string;
  description?: string;
  userId: string;
  useAI?: boolean;
  aiGenerationParams?: AIGenerationParams;
  questions?: CreateQuestionRequest[];
}

export interface CreateQuestionRequest {
  text: string;
  type: string;
  options?: string[];
  isRequired?: boolean;
}

export interface AIGenerationParams {
  topic: string;
  questionCount: number;
  questionTypes?: string[];
  targetAudience?: string;
  surveyGoal?: string;
}

/**
 * Response DTO for survey creation
 */
export interface CreateSurveyResponse {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  questions: {
    id: string;
    text: string;
    type: string;
    options: string[];
    isRequired: boolean;
    isAIGenerated: boolean;
  }[];
  isActive: boolean;
  createdAt: Date;
  canBePublished: boolean;
} 