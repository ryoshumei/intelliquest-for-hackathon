/**
 * Survey Response Entity
 * Represents a user's response to a survey
 */

import { ResponseId } from '../value-objects/ResponseId';
import { SurveyId } from '../value-objects/SurveyId';
import { QuestionId } from '../value-objects/QuestionId';

export interface QuestionResponse {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string | string[] | number;
  answeredAt: Date;
}

export interface SurveyResponseData {
  id: string;
  surveyId: string;
  respondentId?: string; // Optional for anonymous responses
  respondentEmail?: string;
  responses: QuestionResponse[];
  startedAt: Date;
  submittedAt?: Date;
  isComplete: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class SurveyResponse {
  private constructor(
    private readonly id: ResponseId,
    private readonly surveyId: SurveyId,
    private responses: Map<string, QuestionResponse>,
    private readonly startedAt: Date,
    private submittedAt?: Date,
    private readonly respondentId?: string,
    private readonly respondentEmail?: string,
    private readonly metadata?: Record<string, any>
  ) {}

  // Factory method for creating new response
  static create(
    surveyId: SurveyId,
    respondentId?: string,
    respondentEmail?: string,
    metadata?: Record<string, any>
  ): SurveyResponse {
    return new SurveyResponse(
      ResponseId.generate(),
      surveyId,
      new Map(),
      new Date(),
      undefined,
      respondentId,
      respondentEmail,
      metadata
    );
  }

  // Factory method for reconstructing from data
  static fromData(data: SurveyResponseData): SurveyResponse {
    const responsesMap = new Map<string, QuestionResponse>();
    data.responses.forEach(response => {
      responsesMap.set(response.questionId, response);
    });

    return new SurveyResponse(
      ResponseId.create(data.id),
      SurveyId.create(data.surveyId),
      responsesMap,
      data.startedAt,
      data.submittedAt,
      data.respondentId,
      data.respondentEmail,
      data.metadata
    );
  }

  // Add or update a question response
  addResponse(
    questionId: QuestionId,
    questionText: string,
    questionType: string,
    answer: string | string[] | number
  ): void {
    if (this.isSubmitted()) {
      throw new Error('Cannot modify submitted response');
    }

    const questionResponse: QuestionResponse = {
      questionId: questionId.getValue(),
      questionText,
      questionType,
      answer,
      answeredAt: new Date()
    };

    this.responses.set(questionId.getValue(), questionResponse);
  }

  // Submit the response (mark as complete)
  submit(): void {
    if (this.responses.size === 0) {
      throw new Error('Cannot submit empty response');
    }

    this.submittedAt = new Date();
  }

  // Getters
  getId(): ResponseId {
    return this.id;
  }

  getSurveyId(): SurveyId {
    return this.surveyId;
  }

  getResponses(): QuestionResponse[] {
    return Array.from(this.responses.values());
  }

  getResponse(questionId: QuestionId): QuestionResponse | undefined {
    return this.responses.get(questionId.getValue());
  }

  getStartedAt(): Date {
    return this.startedAt;
  }

  getSubmittedAt(): Date | undefined {
    return this.submittedAt;
  }

  getRespondentId(): string | undefined {
    return this.respondentId;
  }

  getRespondentEmail(): string | undefined {
    return this.respondentEmail;
  }

  getMetadata(): Record<string, any> | undefined {
    return this.metadata;
  }

  // Status checks
  isSubmitted(): boolean {
    return this.submittedAt !== undefined;
  }

  isComplete(): boolean {
    return this.isSubmitted();
  }

  getResponseCount(): number {
    return this.responses.size;
  }

  // Convert to data for persistence
  toData(): SurveyResponseData {
    return {
      id: this.id.getValue(),
      surveyId: this.surveyId.getValue(),
      respondentId: this.respondentId,
      respondentEmail: this.respondentEmail,
      responses: this.getResponses(),
      startedAt: this.startedAt,
      submittedAt: this.submittedAt,
      isComplete: this.isComplete(),
      metadata: this.metadata
    };
  }
} 