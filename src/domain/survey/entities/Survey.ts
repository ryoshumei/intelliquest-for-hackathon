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

  // Phase 3: New properties
  private goal: string = '';
  private dynamicQuestions: Question[] = [];
  private maxQuestions: number = 10;
  private targetLanguage: string = 'en';
  private autoTranslate: boolean = false;

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
   * Phase 3: Enhanced with new fields
   */
  static fromPersistence(
    id: string,
    title: string,
    description: string,
    goal: string,
    questions: Question[],
    dynamicQuestions: Question[],
    maxQuestions: number,
    targetLanguage: string,
    autoTranslate: boolean,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date
  ): Survey {
    const survey = new Survey(
      SurveyId.fromString(id),
      title,
      description,
      questions,
      isActive,
      createdAt,
      updatedAt
    );
    
    // Set Phase 3 properties
    survey.goal = goal;
    survey.dynamicQuestions = dynamicQuestions;
    survey.maxQuestions = maxQuestions;
    survey.targetLanguage = targetLanguage;
    survey.autoTranslate = autoTranslate;
    
    return survey;
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

  /**
   * Business Rule: Survey can generate dynamic questions if it has a goal and hasn't reached max questions
   * Phase 3: Dynamic question generation validation
   */
  canGenerateDynamicQuestions(): boolean {
    return this.goal.trim().length > 0 && this.getTotalQuestionCount() < this.maxQuestions;
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

  // Phase 3: Get total question count including dynamic questions
  getTotalQuestionCount(): number {
    return this.questions.length + this.dynamicQuestions.length;
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

  // Phase 3: New getters
  getGoal(): string {
    return this.goal;
  }

  getDynamicQuestions(): Question[] {
    return [...this.dynamicQuestions];
  }

  getMaxQuestions(): number {
    return this.maxQuestions;
  }

  getTargetLanguage(): string {
    return this.targetLanguage;
  }

  getAutoTranslate(): boolean {
    return this.autoTranslate;
  }

  // Phase 3: Setters for configuration
  setGoal(goal: string): void {
    this.goal = goal.trim();
    this.updateTimestamp();
  }

  setMaxQuestions(maxQuestions: number): void {
    if (maxQuestions < 5 || maxQuestions > 50) {
      throw new DomainError('Max questions must be between 5 and 50');
    }
    this.maxQuestions = maxQuestions;
    this.updateTimestamp();
  }

  setTargetLanguage(targetLanguage: string): void {
    this.targetLanguage = targetLanguage;
    this.updateTimestamp();
  }

  setAutoTranslate(autoTranslate: boolean): void {
    this.autoTranslate = autoTranslate;
    this.updateTimestamp();
  }

  addDynamicQuestion(question: Question): void {
    this.dynamicQuestions.push(question);
    this.updateTimestamp();
  }

  clearDynamicQuestions(): void {
    this.dynamicQuestions = [];
    this.updateTimestamp();
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
   * Phase 3: Enhanced with new fields
   */
  toPlainObject() {
    return {
      id: this.getId(),
      title: this.title,
      description: this.description,
      goal: this.goal,
      questions: this.questions.map(q => q.toPlainObject()),
      dynamicQuestions: this.dynamicQuestions.map(q => q.toPlainObject()),
      maxQuestions: this.maxQuestions,
      targetLanguage: this.targetLanguage,
      autoTranslate: this.autoTranslate,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
} 