/**
 * Response ID Value Object
 * Represents a unique identifier for survey responses
 */
export class ResponseId {
  private constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Response ID cannot be empty');
    }
  }

  static create(value: string): ResponseId {
    return new ResponseId(value);
  }

  static generate(): ResponseId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return new ResponseId(`response_${timestamp}_${random}`);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ResponseId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
} 