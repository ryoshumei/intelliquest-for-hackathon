/**
 * Domain Error - Represents business rule violations
 * This error should be caught and handled by the application layer
 */
export class DomainError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'DOMAIN_ERROR'
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }

  /**
   * Create a domain error for validation failures
   */
  static validation(message: string): DomainError {
    return new DomainError(message, 'VALIDATION_ERROR');
  }

  /**
   * Create a domain error for business rule violations
   */
  static businessRule(message: string): DomainError {
    return new DomainError(message, 'BUSINESS_RULE_VIOLATION');
  }

  /**
   * Create a domain error for not found entities
   */
  static notFound(entityName: string, id: string): DomainError {
    return new DomainError(
      `${entityName} with id ${id} not found`,
      'ENTITY_NOT_FOUND'
    );
  }

  /**
   * Create a domain error for unauthorized operations
   */
  static unauthorized(operation: string): DomainError {
    return new DomainError(
      `Unauthorized to perform operation: ${operation}`,
      'UNAUTHORIZED_OPERATION'
    );
  }

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
} 