import { Survey } from '../entities/Survey';
import { SurveyId } from '../value-objects/SurveyId';

/**
 * Survey Repository Interface
 * Defines the contract for survey persistence operations
 * Implementation will be provided by the infrastructure layer
 */
export interface SurveyRepository {
  /**
   * Save a survey (create or update)
   */
  save(survey: Survey): Promise<Survey>;

  /**
   * Find survey by ID
   */
  findById(id: SurveyId): Promise<Survey | null>;

  /**
   * Find survey by ID (string version for convenience)
   */
  findByIdString(id: string): Promise<Survey | null>;

  /**
   * Find all surveys for a user
   */
  findByUserId(userId: string): Promise<Survey[]>;

  /**
   * Find surveys with pagination
   */
  findWithPagination(
    offset: number,
    limit: number,
    filters?: SurveyFilters
  ): Promise<{
    surveys: Survey[];
    total: number;
    hasMore: boolean;
  }>;

  /**
   * Delete a survey
   */
  delete(id: SurveyId): Promise<void>;

  /**
   * Check if survey exists
   */
  exists(id: SurveyId): Promise<boolean>;

  /**
   * Find surveys by title (search)
   */
  findByTitle(title: string, userId?: string): Promise<Survey[]>;

  /**
   * Get survey statistics
   */
  getStatistics(userId?: string): Promise<SurveyStatistics>;
}

/**
 * Survey filters for search and pagination
 */
export interface SurveyFilters {
  userId?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  titleContains?: string;
  hasAIQuestions?: boolean;
}

/**
 * Survey statistics
 */
export interface SurveyStatistics {
  totalSurveys: number;
  activeSurveys: number;
  totalQuestions: number;
  aiGeneratedQuestions: number;
  averageQuestionsPerSurvey: number;
} 