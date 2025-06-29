/**
 * Submit Survey Response Use Case
 * Handles the submission of survey responses
 */

import { SurveyResponse, QuestionResponse } from '../../domain/survey/entities/SurveyResponse';
import { SurveyId } from '../../domain/survey/value-objects/SurveyId';
import { QuestionId } from '../../domain/survey/value-objects/QuestionId';
import { SurveyRepository } from '../../domain/survey/repositories/SurveyRepository';
import { EventBus } from '../services/EventBus';

export interface SubmitResponseParams {
  surveyId: string;
  responses: {
    questionId: string;
    questionText: string;
    questionType: string;
    answer: string | string[] | number;
  }[];
  respondentId?: string;
  respondentEmail?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

export interface SurveyResponseRepository {
  save(response: SurveyResponse): Promise<void>;
  findById(id: string): Promise<SurveyResponse | null>;
  findBySurveyId(surveyId: string): Promise<SurveyResponse[]>;
  findByRespondentId(respondentId: string): Promise<SurveyResponse[]>;
}

export class SubmitSurveyResponseUseCase {
  constructor(
    private surveyRepository: SurveyRepository,
    private responseRepository: SurveyResponseRepository,
    private eventBus: EventBus
  ) {}

  async execute(params: SubmitResponseParams): Promise<{
    success: boolean;
    responseId?: string;
    message: string;
  }> {
    try {
      // 1. Validate survey exists
      const surveyId = SurveyId.fromString(params.surveyId);
      const survey = await this.surveyRepository.findById(surveyId);
      
      if (!survey) {
        return {
          success: false,
          message: 'Survey not found'
        };
      }

      // 2. Create survey response
      const surveyResponse = SurveyResponse.create(
        surveyId,
        params.respondentId,
        params.respondentEmail,
        params.metadata
      );

      // 3. Add responses for each question
      for (const responseData of params.responses) {
        const questionId = QuestionId.fromString(responseData.questionId);
        
        // Validate question exists in survey (check both regular and dynamic questions)
        const question = survey.getQuestions().find(q => 
          q.getId() === questionId.getValue()
        ) || survey.getDynamicQuestions().find(q => 
          q.getId() === questionId.getValue()
        );
        
        if (!question) {
          console.warn(`Question ${responseData.questionId} not found in survey`);
          continue;
        }

        surveyResponse.addResponse(
          questionId,
          responseData.questionText,
          responseData.questionType,
          responseData.answer
        );
      }

      // 4. Submit the response
      surveyResponse.submit();

      // 5. Save to repository
      await this.responseRepository.save(surveyResponse);

      // 6. Log submission (simplified event handling)
      console.log('Survey response submitted:', {
        responseId: surveyResponse.getId().getValue(),
        surveyId: params.surveyId,
        respondentId: params.respondentId,
        responseCount: surveyResponse.getResponseCount(),
        submittedAt: new Date()
      });

      return {
        success: true,
        responseId: surveyResponse.getId().getValue(),
        message: 'Survey response submitted successfully'
      };

    } catch (error) {
      console.error('Error submitting survey response:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit response'
      };
    }
  }
} 