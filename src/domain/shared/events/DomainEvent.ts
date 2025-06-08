/**
 * Domain Event base class
 * All domain events should extend this class
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly eventType: string;
  public readonly occurredOn: Date;
  public readonly version: number;

  constructor(
    aggregateId: string,
    eventType: string,
    version: number = 1
  ) {
    this.eventId = this.generateEventId();
    this.aggregateId = aggregateId;
    this.eventType = eventType;
    this.occurredOn = new Date();
    this.version = version;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `event_${timestamp}_${random}`;
  }

  /**
   * Get event data for serialization
   */
  abstract getEventData(): Record<string, unknown>;

  /**
   * Convert event to JSON for persistence/messaging
   */
  toJSON() {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredOn: this.occurredOn,
      version: this.version,
      data: this.getEventData()
    };
  }
} 