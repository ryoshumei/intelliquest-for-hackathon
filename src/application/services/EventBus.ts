import { DomainEvent } from '../../domain/shared/events/DomainEvent';

/**
 * Event Bus Interface
 * Handles domain event publishing and subscription
 * Implementation will be provided by the infrastructure layer
 */
export interface EventBus {
  /**
   * Publish a domain event
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple events in batch
   */
  publishBatch(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe to events of a specific type
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void;

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, handler: EventHandler<DomainEvent>): void;

  /**
   * Clear all event handlers
   */
  clear(): void;
}

/**
 * Event Handler interface
 */
export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * Event Bus Statistics
 */
export interface EventBusStats {
  totalEventsPublished: number;
  totalHandlersRegistered: number;
  eventTypeStats: Record<string, number>;
  averageProcessingTime: number;
} 