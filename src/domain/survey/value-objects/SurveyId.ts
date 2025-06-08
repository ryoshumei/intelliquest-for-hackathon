import { DomainError } from '../../shared/errors/DomainError';

/**
 * SurveyId Value Object - Ensures survey ID consistency and validation
 */
export class SurveyId {
  private constructor(private readonly value: string) {
    this.validate(value);
  }

  /**
   * Generate a new unique survey ID
   */
  static generate(): SurveyId {
    // Generate UUID-like ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    const id = `survey_${timestamp}_${random}`;
    
    return new SurveyId(id);
  }

  /**
   * Create SurveyId from existing string (for persistence layer)
   */
  static fromString(value: string): SurveyId {
    return new SurveyId(value);
  }

  /**
   * Validate survey ID format
   */
  private validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new DomainError('Survey ID must be a non-empty string');
    }

    if (value.trim().length === 0) {
      throw new DomainError('Survey ID cannot be empty');
    }

    // Basic format validation - you can make this more strict
    if (value.length < 3 || value.length > 100) {
      throw new DomainError('Survey ID must be between 3 and 100 characters');
    }
  }

  /**
   * Get the ID value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Check equality with another SurveyId
   */
  equals(other: SurveyId): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }
} 