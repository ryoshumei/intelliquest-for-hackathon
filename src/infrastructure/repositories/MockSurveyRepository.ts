import { Survey } from '@/domain/survey/entities/Survey';
import { SurveyId } from '@/domain/survey/value-objects/SurveyId';
import { 
  SurveyRepository, 
  SurveyFilters, 
  SurveyStatistics 
} from '@/domain/survey/repositories/SurveyRepository';

/**
 * Mock Survey Repository for testing and demo purposes
 * In production, this would be replaced with a real Firestore implementation
 */
export class MockSurveyRepository implements SurveyRepository {
  private surveys: Map<string, Survey> = new Map();

  async save(survey: Survey): Promise<Survey> {
    // Simulate database save delay
    await this.delay(100);
    
    this.surveys.set(survey.getId(), survey);
    console.log(`MockSurveyRepository: Saved survey ${survey.getId()}`);
    
    return survey;
  }

  async findById(id: SurveyId): Promise<Survey | null> {
    await this.delay(50);
    
    const survey = this.surveys.get(id.getValue());
    return survey || null;
  }

  async findByIdString(id: string): Promise<Survey | null> {
    await this.delay(50);
    
    const survey = this.surveys.get(id);
    return survey || null;
  }

  async findByUserId(_userId: string): Promise<Survey[]> {
    await this.delay(100);
    
    // In real implementation, this would filter by userId
    // For mock, return all surveys
    return Array.from(this.surveys.values());
  }

  async findWithPagination(
    offset: number,
    limit: number,
    filters?: SurveyFilters
  ): Promise<{
    surveys: Survey[];
    total: number;
    hasMore: boolean;
  }> {
    await this.delay(100);
    
    const allSurveys = Array.from(this.surveys.values());
    const filteredSurveys = this.applyFilters(allSurveys, filters);
    
    const paginatedSurveys = filteredSurveys.slice(offset, offset + limit);
    
    return {
      surveys: paginatedSurveys,
      total: filteredSurveys.length,
      hasMore: offset + limit < filteredSurveys.length
    };
  }

  async delete(id: SurveyId): Promise<void> {
    await this.delay(50);
    
    this.surveys.delete(id.getValue());
    console.log(`MockSurveyRepository: Deleted survey ${id.getValue()}`);
  }

  async exists(id: SurveyId): Promise<boolean> {
    await this.delay(50);
    
    return this.surveys.has(id.getValue());
  }

  async findByTitle(title: string, _userId?: string): Promise<Survey[]> {
    await this.delay(100);
    
    const allSurveys = Array.from(this.surveys.values());
    return allSurveys.filter(survey => 
      survey.getTitle().toLowerCase().includes(title.toLowerCase())
    );
  }

  async getStatistics(_userId?: string): Promise<SurveyStatistics> {
    await this.delay(150);
    
    const allSurveys = Array.from(this.surveys.values());
    const activeSurveys = allSurveys.filter(s => s.getIsActive());
    
    const totalQuestions = allSurveys.reduce(
      (sum, survey) => sum + survey.getQuestionCount(), 
      0
    );
    
    const aiGeneratedQuestions = allSurveys.reduce(
      (sum, survey) => {
        const aiQuestions = survey.getQuestions().filter(q => q.getIsAIGenerated());
        return sum + aiQuestions.length;
      },
      0
    );

    return {
      totalSurveys: allSurveys.length,
      activeSurveys: activeSurveys.length,
      totalQuestions,
      aiGeneratedQuestions,
      averageQuestionsPerSurvey: allSurveys.length > 0 
        ? totalQuestions / allSurveys.length 
        : 0
    };
  }

  // Helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private applyFilters(surveys: Survey[], filters?: SurveyFilters): Survey[] {
    if (!filters) return surveys;

    return surveys.filter(survey => {
      if (filters.isActive !== undefined && survey.getIsActive() !== filters.isActive) {
        return false;
      }

      if (filters.titleContains && 
          !survey.getTitle().toLowerCase().includes(filters.titleContains.toLowerCase())) {
        return false;
      }

      if (filters.createdAfter && survey.getCreatedAt() < filters.createdAfter) {
        return false;
      }

      if (filters.createdBefore && survey.getCreatedAt() > filters.createdBefore) {
        return false;
      }

      if (filters.hasAIQuestions !== undefined) {
        const hasAI = survey.getQuestions().some(q => q.getIsAIGenerated());
        if (hasAI !== filters.hasAIQuestions) {
          return false;
        }
      }

      return true;
    });
  }

  // Utility methods for testing
  clear(): void {
    this.surveys.clear();
  }

  getSize(): number {
    return this.surveys.size;
  }

  getAllSurveys(): Survey[] {
    return Array.from(this.surveys.values());
  }
} 