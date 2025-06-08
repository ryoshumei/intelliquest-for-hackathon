import { QuestionId } from '../value-objects/QuestionId';
import { QuestionType } from '../value-objects/QuestionType';
import { DomainError } from '../../shared/errors/DomainError';

/**
 * Question Entity - Represents a survey question with validation rules
 */
export class Question {
  private constructor(
    private readonly id: QuestionId,
    private text: string,
    private type: QuestionType,
    private options: string[] = [],
    private isRequired: boolean = true,
    private isAIGenerated: boolean = false,
    private order: number = 0,
    private createdAt: Date = new Date()
  ) {}

  /**
   * Factory method to create a new question
   */
  static create(
    text: string,
    type: QuestionType,
    options?: string[],
    isRequired: boolean = true
  ): Question {
    if (!text.trim()) {
      throw new DomainError('Question text cannot be empty');
    }

    const question = new Question(
      QuestionId.generate(),
      text.trim(),
      type,
      options || [],
      isRequired
    );

    question.validateQuestionStructure();

    return question;
  }

  /**
   * Factory method to create AI-generated question
   */
  static createAIGenerated(
    text: string,
    type: QuestionType,
    options?: string[]
  ): Question {
    const question = Question.create(text, type, options);
    question.isAIGenerated = true;
    return question;
  }

  /**
   * Factory method to recreate from persistence
   */
  static fromPersistence(
    id: string,
    text: string,
    type: QuestionType,
    options: string[],
    isRequired: boolean,
    isAIGenerated: boolean,
    order: number,
    createdAt: Date
  ): Question {
    return new Question(
      QuestionId.fromString(id),
      text,
      type,
      options,
      isRequired,
      isAIGenerated,
      order,
      createdAt
    );
  }

  /**
   * Business Rule: Multiple choice questions must have at least 2 options
   */
  private validateQuestionStructure(): void {
    if (this.type.isMultipleChoice() && this.options.length < 2) {
      throw new DomainError('Multiple choice questions must have at least 2 options');
    }

    if (this.type.isScale() && this.options.length !== 2) {
      throw new DomainError('Scale questions must have exactly 2 options (min and max labels)');
    }
  }

  /**
   * Update question text
   */
  updateText(text: string): void {
    if (!text.trim()) {
      throw new DomainError('Question text cannot be empty');
    }
    
    this.text = text.trim();
  }

  /**
   * Add option for multiple choice questions
   */
  addOption(option: string): void {
    if (!this.type.isMultipleChoice()) {
      throw new DomainError('Can only add options to multiple choice questions');
    }

    if (!option.trim()) {
      throw new DomainError('Option text cannot be empty');
    }

    if (this.options.length >= 10) {
      throw new DomainError('Question cannot have more than 10 options');
    }

    this.options.push(option.trim());
  }

  /**
   * Remove option from multiple choice questions
   */
  removeOption(index: number): void {
    if (!this.type.isMultipleChoice()) {
      throw new DomainError('Can only remove options from multiple choice questions');
    }

    if (index < 0 || index >= this.options.length) {
      throw new DomainError('Invalid option index');
    }

    this.options.splice(index, 1);
    this.validateQuestionStructure();
  }

  /**
   * Update option text
   */
  updateOption(index: number, text: string): void {
    if (!this.type.isMultipleChoice()) {
      throw new DomainError('Can only update options for multiple choice questions');
    }

    if (index < 0 || index >= this.options.length) {
      throw new DomainError('Invalid option index');
    }

    if (!text.trim()) {
      throw new DomainError('Option text cannot be empty');
    }

    this.options[index] = text.trim();
  }

  /**
   * Set question order
   */
  setOrder(order: number): void {
    if (order < 0) {
      throw new DomainError('Question order cannot be negative');
    }
    
    this.order = order;
  }

  /**
   * Set question as required/optional
   */
  setRequired(isRequired: boolean): void {
    this.isRequired = isRequired;
  }

  // Getters
  getId(): string {
    return this.id.getValue();
  }

  getText(): string {
    return this.text;
  }

  getType(): QuestionType {
    return this.type;
  }

  getOptions(): string[] {
    return [...this.options];
  }

  getIsRequired(): boolean {
    return this.isRequired;
  }

  getIsAIGenerated(): boolean {
    return this.isAIGenerated;
  }

  getOrder(): number {
    return this.order;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * Convert to plain object for persistence
   */
  toPlainObject() {
    return {
      id: this.getId(),
      text: this.text,
      type: this.type.getValue(),
      options: this.options,
      isRequired: this.isRequired,
      isAIGenerated: this.isAIGenerated,
      order: this.order,
      createdAt: this.createdAt
    };
  }
} 