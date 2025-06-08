import { DomainError } from '../../shared/errors/DomainError';

/**
 * QuestionId Value Object - Ensures question ID consistency and validation
 */
export class QuestionId {
  private constructor(private readonly value: string) {
    this.validate(value);
  }

  /**
   * Generate a new unique question ID
   */
  static generate(): QuestionId {
    // Generate UUID-like ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    const id = `question_${timestamp}_${random}`;
    
    return new QuestionId(id);
  }

  /**
   * Create QuestionId from existing string (for persistence layer)
   */
  static fromString(value: string): QuestionId {
    return new QuestionId(value);
  }

  /**
   * Validate question ID format
   */
  private validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new DomainError('Question ID must be a non-empty string');
    }

    if (value.trim().length === 0) {
      throw new DomainError('Question ID cannot be empty');
    }

    if (value.length < 3 || value.length > 100) {
      throw new DomainError('Question ID must be between 3 and 100 characters');
    }
  }

  /**
   * Get the ID value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Check equality with another QuestionId
   */
  equals(other: QuestionId): boolean {
    return this.value === other.value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }
} 