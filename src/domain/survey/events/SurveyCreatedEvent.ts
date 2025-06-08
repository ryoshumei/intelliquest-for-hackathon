import { DomainEvent } from '../../shared/events/DomainEvent';
import { SurveyId } from '../value-objects/SurveyId';

/**
 * Survey Created Domain Event
 * Fired when a new survey is created
 */
export class SurveyCreatedEvent extends DomainEvent {
  constructor(
    private readonly surveyId: SurveyId,
    private readonly title: string,
    private readonly createdBy?: string
  ) {
    super(surveyId.getValue(), 'SurveyCreated');
  }

  getEventData(): Record<string, unknown> {
    return {
      surveyId: this.surveyId.getValue(),
      title: this.title,
      createdBy: this.createdBy
    };
  }

  getSurveyId(): string {
    return this.surveyId.getValue();
  }

  getTitle(): string {
    return this.title;
  }

  getCreatedBy(): string | undefined {
    return this.createdBy;
  }
} 