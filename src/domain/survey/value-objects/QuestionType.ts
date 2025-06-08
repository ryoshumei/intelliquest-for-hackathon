import { DomainError } from '../../shared/errors/DomainError';

/**
 * Question types supported by the system
 */
export enum QuestionTypeEnum {
  TEXT = 'text',              // Free text input
  TEXTAREA = 'textarea',      // Long text input
  SINGLE_CHOICE = 'single_choice',    // Radio buttons
  MULTIPLE_CHOICE = 'multiple_choice', // Checkboxes
  SCALE = 'scale',            // 1-5, 1-10 rating scale
  YES_NO = 'yes_no',          // Boolean question
  EMAIL = 'email',            // Email validation
  NUMBER = 'number',          // Numeric input
  DATE = 'date',              // Date picker
  RANKING = 'ranking'         // Rank options in order
}

/**
 * QuestionType Value Object - Ensures type consistency and provides behavior
 */
export class QuestionType {
  private constructor(private readonly value: QuestionTypeEnum) {}

  /**
   * Create QuestionType from enum value
   */
  static create(type: QuestionTypeEnum): QuestionType {
    return new QuestionType(type);
  }

  /**
   * Create QuestionType from string value
   */
  static fromString(value: string): QuestionType {
    const enumValue = Object.values(QuestionTypeEnum).find(
      (type) => type === value
    );

    if (!enumValue) {
      throw new DomainError(
        `Invalid question type: ${value}. Valid types are: ${Object.values(QuestionTypeEnum).join(', ')}`
      );
    }

    return new QuestionType(enumValue);
  }

  /**
   * Factory methods for common types
   */
  static text(): QuestionType {
    return new QuestionType(QuestionTypeEnum.TEXT);
  }

  static textarea(): QuestionType {
    return new QuestionType(QuestionTypeEnum.TEXTAREA);
  }

  static singleChoice(): QuestionType {
    return new QuestionType(QuestionTypeEnum.SINGLE_CHOICE);
  }

  static multipleChoice(): QuestionType {
    return new QuestionType(QuestionTypeEnum.MULTIPLE_CHOICE);
  }

  static scale(): QuestionType {
    return new QuestionType(QuestionTypeEnum.SCALE);
  }

  static yesNo(): QuestionType {
    return new QuestionType(QuestionTypeEnum.YES_NO);
  }

  static email(): QuestionType {
    return new QuestionType(QuestionTypeEnum.EMAIL);
  }

  static number(): QuestionType {
    return new QuestionType(QuestionTypeEnum.NUMBER);
  }

  static date(): QuestionType {
    return new QuestionType(QuestionTypeEnum.DATE);
  }

  static ranking(): QuestionType {
    return new QuestionType(QuestionTypeEnum.RANKING);
  }

  /**
   * Type checking methods
   */
  isMultipleChoice(): boolean {
    return this.value === QuestionTypeEnum.SINGLE_CHOICE || 
           this.value === QuestionTypeEnum.MULTIPLE_CHOICE ||
           this.value === QuestionTypeEnum.RANKING;
  }

  isScale(): boolean {
    return this.value === QuestionTypeEnum.SCALE;
  }

  requiresOptions(): boolean {
    return this.isMultipleChoice() || this.isScale();
  }

  isTextBased(): boolean {
    return this.value === QuestionTypeEnum.TEXT || 
           this.value === QuestionTypeEnum.TEXTAREA ||
           this.value === QuestionTypeEnum.EMAIL;
  }

  allowsValidation(): boolean {
    return this.value === QuestionTypeEnum.EMAIL || 
           this.value === QuestionTypeEnum.NUMBER ||
           this.value === QuestionTypeEnum.DATE;
  }

  /**
   * Get the enum value
   */
  getValue(): QuestionTypeEnum {
    return this.value;
  }

  /**
   * Get string representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * Get human-readable display name
   */
  getDisplayName(): string {
    const displayNames: Record<QuestionTypeEnum, string> = {
      [QuestionTypeEnum.TEXT]: '短文本',
      [QuestionTypeEnum.TEXTAREA]: '长文本',
      [QuestionTypeEnum.SINGLE_CHOICE]: '单选题',
      [QuestionTypeEnum.MULTIPLE_CHOICE]: '多选题',
      [QuestionTypeEnum.SCALE]: '评分题',
      [QuestionTypeEnum.YES_NO]: '是非题',
      [QuestionTypeEnum.EMAIL]: '邮箱',
      [QuestionTypeEnum.NUMBER]: '数字',
      [QuestionTypeEnum.DATE]: '日期',
      [QuestionTypeEnum.RANKING]: '排序题'
    };

    return displayNames[this.value];
  }

  /**
   * Check equality with another QuestionType
   */
  equals(other: QuestionType): boolean {
    return this.value === other.value;
  }

  /**
   * Get all available question types
   */
  static getAllTypes(): QuestionType[] {
    return Object.values(QuestionTypeEnum).map(type => new QuestionType(type));
  }
} 