import { DomainEvent } from '@/domain/shared/events/DomainEvent';
import { EventBus, EventHandler } from '@/application/services/EventBus';

/**
 * Mock Event Bus for testing and demo purposes
 * In production, this would be replaced with a real implementation using Firebase Pub/Sub or similar
 */
export class MockEventBus implements EventBus {
  private handlers: Map<string, EventHandler<DomainEvent>[]> = new Map();
  private publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    console.log(`MockEventBus: Publishing event ${event.eventType} for aggregate ${event.aggregateId}`);
    
    // Store event for testing purposes
    this.publishedEvents.push(event);
    
    // Get handlers for this event type
    const eventHandlers = this.handlers.get(event.eventType) || [];
    
    // Execute all handlers
    const handlerPromises = eventHandlers.map(handler => 
      this.executeHandler(handler, event)
    );
    
    await Promise.all(handlerPromises);
    
    console.log(`MockEventBus: Event ${event.eventType} processed by ${eventHandlers.length} handlers`);
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    console.log(`MockEventBus: Publishing batch of ${events.length} events`);
    
    const publishPromises = events.map(event => this.publish(event));
    await Promise.all(publishPromises);
    
    console.log(`MockEventBus: Batch of ${events.length} events published successfully`);
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    console.log(`MockEventBus: Subscribing handler to event type: ${eventType}`);
    
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string, handler: EventHandler<DomainEvent>): void {
    console.log(`MockEventBus: Unsubscribing handler from event type: ${eventType}`);
    
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  clear(): void {
    console.log(`MockEventBus: Clearing all handlers and events`);
    this.handlers.clear();
    this.publishedEvents = [];
  }

  // Helper method to execute handler with error handling
  private async executeHandler(handler: EventHandler<DomainEvent>, event: DomainEvent): Promise<void> {
    try {
      await handler.handle(event);
    } catch (error) {
      console.error(`MockEventBus: Error executing handler for event ${event.eventType}:`, error);
      // In production, you might want to implement retry logic, dead letter queues, etc.
    }
  }

  // Utility methods for testing
  getPublishedEvents(): DomainEvent[] {
    return [...this.publishedEvents];
  }

  getEventsByType(eventType: string): DomainEvent[] {
    return this.publishedEvents.filter(event => event.eventType === eventType);
  }

  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  getAllHandlerCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.handlers.forEach((handlers, eventType) => {
      counts[eventType] = handlers.length;
    });
    return counts;
  }

  reset(): void {
    this.publishedEvents = [];
  }
} 