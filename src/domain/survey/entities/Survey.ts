import { SurveyId } from '../value-objects/SurveyId';
import { Question } from './Question';
import { DomainError } from '../../shared/errors/DomainError';
import { DomainEvent } from '../../shared/events/DomainEvent';
import { SurveyCreatedEvent } from '../events/SurveyCreatedEvent';

/**
 * Survey Entity - Core business logic for surveys
 * Represents a survey with questions and business rules
 */
export class Survey {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: SurveyId,
    private title: string,
    private description: string = '',
    private questions: Question[] = [],
    private isActive: boolean = true,
    private createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  /**
   * Factory method to create a new survey
   */
  static create(title: string, description?: string): Survey {
    if (!title.trim()) {
      throw new DomainError('Survey title cannot be empty');
    }

    const survey = new Survey(
      SurveyId.generate(),
      title.trim(),
      description?.trim() || ''
    );

    // Add domain event
    survey.addDomainEvent(new SurveyCreatedEvent(survey.id, survey.title));

    return survey;
  }

  /**
   * Factory method to recreate survey from persistence
   */
  static fromPersistence(
    id: string,
    title: string,
    description: string,
    questions: Question[],
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date
  ): Survey {
    return new Survey(
      SurveyId.fromString(id),
      title,
      description,
      questions,
      isActive,
      createdAt,
      updatedAt
    );
  }

  /**
   * Business Rule: Survey can have maximum 50 questions
   */
  addQuestion(question: Question): void {
    if (this.questions.length >= 50) {
      throw new DomainError('Survey cannot have more than 50 questions');
    }
    
    this.questions.push(question);
    this.updateTimestamp();
  }

  /**
   * Business Rule: Cannot remove question if survey has responses
   */
  removeQuestion(questionId: string): void {
    const questionIndex = this.questions.findIndex(q => q.getId() === questionId);
    
    if (questionIndex === -1) {
      throw new DomainError('Question not found in survey');
    }

    this.questions.splice(questionIndex, 1);
    this.updateTimestamp();
  }

  /**
   * Business Rule: Title must not be empty
   */
  updateTitle(title: string): void {
    if (!title.trim()) {
      throw new DomainError('Survey title cannot be empty');
    }
    
    this.title = title.trim();
    this.updateTimestamp();
  }

  /**
   * Update survey description
   */
  updateDescription(description: string): void {
    this.description = description.trim();
    this.updateTimestamp();
  }

  /**
   * Business Rule: Only active surveys can be deactivated
   */
  deactivate(): void {
    if (!this.isActive) {
      throw new DomainError('Survey is already inactive');
    }
    
    this.isActive = false;
    this.updateTimestamp();
  }

  /**
   * Activate survey
   */
  activate(): void {
    this.isActive = true;
    this.updateTimestamp();
  }

  /**
   * Business Rule: Survey must have at least one question to be published
   */
  canBePublished(): boolean {
    return this.questions.length > 0 && this.isActive;
  }

  // Getters
  getId(): string {
    return this.id.getValue();
  }

  getTitle(): string {
    return this.title;
  }

  getDescription(): string {
    return this.description;
  }

  getQuestions(): Question[] {
    return [...this.questions]; // Return copy to prevent external modification
  }

  getQuestionCount(): number {
    return this.questions.length;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Domain Events
  addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  clearDomainEvents(): void {
    this.domainEvents.length = 0;
  }

  // Private helper methods
  private updateTimestamp(): void {
    this.updatedAt = new Date();
  }

  /**
   * Convert to plain object for persistence
   */
  toPlainObject() {
    return {
      id: this.getId(),
      title: this.title,
      description: this.description,
      questions: this.questions.map(q => q.toPlainObject()),
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
} 