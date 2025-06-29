/**
 * Analytics Service Interface
 * Phase 3: Comprehensive analytics and reporting for survey makers
 */

import { Survey } from '@/domain/survey/entities/Survey';
import { SurveyResponse } from '@/domain/survey/entities/SurveyResponse';
import { Question } from '@/domain/survey/entities/Question';
import { QuestionTypeEnum } from '@/domain/survey/value-objects/QuestionType';

export interface AnalyticsService {
  /**
   * Get real-time analytics for a survey
   */
  getSurveyAnalytics(surveyId: string): Promise<SurveyAnalytics>;

  /**
   * Get response analytics with time-based filtering
   */
  getResponseAnalytics(
    surveyId: string,
    timeFrame: TimeFrame
  ): Promise<ResponseAnalytics>;

  /**
   * Get question-level analytics
   */
  getQuestionAnalytics(
    surveyId: string,
    questionId?: string
  ): Promise<QuestionAnalytics[]>;

  /**
   * Generate comprehensive analytics report
   */
  generateAnalyticsReport(
    surveyId: string,
    reportType: ReportType
  ): Promise<AnalyticsReport>;

  /**
   * Export analytics data in various formats
   */
  exportAnalyticsData(
    surveyId: string,
    format: ExportFormat
  ): Promise<ExportResult>;

  /**
   * Get real-time dashboard data
   */
  getDashboardData(surveyId: string): Promise<DashboardData>;

  /**
   * Get aggregated analytics across multiple surveys
   */
  getAggregatedAnalytics(
    surveyIds: string[],
    timeFrame: TimeFrame
  ): Promise<AggregatedAnalytics>;

  /**
   * AI-powered insights generation (Premium feature)
   */
  generateAIInsights(surveyId: string): Promise<AIInsight[]>;
}

/**
 * Survey Analytics Overview
 */
export interface SurveyAnalytics {
  surveyId: string;
  totalResponses: number;
  completedResponses: number;
  inProgressResponses: number;
  averageCompletionTime: number; // in minutes
  completionRate: number; // percentage
  responseRate: number; // percentage
  dropOffPoints: DropOffPoint[];
  lastUpdated: Date;
}

/**
 * Response Analytics with time-based data
 */
export interface ResponseAnalytics {
  timeFrame: TimeFrame;
  responseTrends: TimeSeries[];
  peakResponseTimes: TimeSlot[];
  geographicDistribution: GeographicData[];
  deviceDistribution: DeviceData[];
  languageDistribution: LanguageData[];
  averageSessionDuration: number;
}

/**
 * Question-level Analytics
 */
export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  questionType: string;
  totalResponses: number;
  responseDistribution: any;
  averageRating?: number;
  mostCommonAnswer?: string;
  textResponseSummary?: string[];
}

/**
 * Analytics Report
 */
export interface AnalyticsReport {
  reportId: string;
  surveyId: string;
  reportType: ReportType;
  generatedAt: Date;
  summary: ReportSummary;
  sections: ReportSection[];
  downloadUrl?: string;
}

/**
 * Dashboard Data for real-time updates
 */
export interface DashboardData {
  overview: SurveyAnalytics;
  recentResponses: RecentResponse[];
  liveMetrics: LiveMetrics;
  alerts: Alert[];
  recommendations: Recommendation[];
}

/**
 * Time Frame for analytics filtering
 */
export type TimeFrame = 
  | '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

/**
 * Report Types
 */
export type ReportType = 
  | 'summary' | 'detailed' | 'comparison' | 'trends' | 'insights';

/**
 * Export Formats
 */
export type ExportFormat = 
  | 'csv' | 'pdf' | 'json' | 'xlsx';

/**
 * Time Series Data Point
 */
export interface TimeSeries {
  timestamp: Date;
  responses: number;
  completions: number;
}

/**
 * Geographic Distribution
 */
export interface GeographicData {
  country: string;
  region?: string;
  city?: string;
  count: number;
  percentage: number;
}

/**
 * Device Distribution
 */
export interface DeviceData {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  count: number;
  percentage: number;
}

/**
 * Language Distribution
 */
export interface LanguageData {
  language: string;
  count: number;
  percentage: number;
}

/**
 * Response Distribution for questions
 */
export interface ResponseDistribution {
  options?: OptionCount[]; // For multiple choice
  ranges?: RangeCount[]; // For rating scales
  categories?: CategoryCount[]; // For categorized responses
  statistics?: ResponseStatistics; // For numeric responses
}

/**
 * Drop-off Analysis
 */
export interface DropOffPoint {
  questionIndex: number;
  questionId: string;
  dropOffRate: number;
  commonExitReasons?: string[];
}

/**
 * Sentiment Analysis for text responses
 */
export interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
  emotionalTones: EmotionalTone[];
}

/**
 * Word Cloud Data
 */
export interface WordCloudData {
  words: WordFrequency[];
  themes: string[];
  commonPhrases: string[];
}

/**
 * AI-Generated Insights
 */
export interface AIInsight {
  type: InsightType;
  title: string;
  description: string;
  significance: 'low' | 'medium' | 'high';
  actionableRecommendations: string[];
  confidence: number;
  supportingData: any;
}

/**
 * Insight Types
 */
export type InsightType = 
  | 'response_pattern' | 'completion_optimization' | 'question_performance' 
  | 'audience_behavior' | 'content_suggestion' | 'timing_optimization';

/**
 * Supporting Interfaces
 */
export interface OptionCount {
  option: string;
  count: number;
  percentage: number;
}

export interface RangeCount {
  range: string;
  count: number;
  percentage: number;
}

export interface CategoryCount {
  category: string;
  count: number;
  percentage: number;
}

export interface ResponseStatistics {
  mean: number;
  median: number;
  mode: number;
  standardDeviation: number;
  min: number;
  max: number;
}

export interface TimeSlot {
  hour: number;
  dayOfWeek: number;
  count: number;
}

export interface EmotionalTone {
  emotion: string;
  intensity: number;
  frequency: number;
}

export interface WordFrequency {
  word: string;
  frequency: number;
  sentiment?: number;
}

export interface RecentResponse {
  responseId: string;
  timestamp: Date;
  isComplete: boolean;
  deviceType: string;
  location?: string;
}

export interface LiveMetrics {
  activeUsers: number;
  responsesLastHour: number;
  currentCompletionRate: number;
  averageTimeOnSurvey: number;
}

export interface Alert {
  type: 'warning' | 'info' | 'success';
  message: string;
  timestamp: Date;
  actionRequired?: boolean;
}

export interface Recommendation {
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface ExportResult {
  downloadUrl: string;
  filename: string;
  size: number;
  expiresAt: Date;
}

export interface AggregatedAnalytics {
  totalSurveys: number;
  totalResponses: number;
  averageCompletionRate: number;
  topPerformingSurveys: SurveyPerformance[];
  trends: AnalyticsTrend[];
}

export interface SurveyPerformance {
  surveyId: string;
  title: string;
  completionRate: number;
  responseCount: number;
  ranking: number;
}

export interface AnalyticsTrend {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
  timeFrame: TimeFrame;
}

export interface ReportSummary {
  keyMetrics: Record<string, number>;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

export interface ReportSection {
  title: string;
  content: any;
  charts?: ChartData[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  data: any;
  options?: any;
}

export interface ExportData {
  survey: Survey;
  responses: SurveyResponse[];
  analytics: SurveyAnalytics;
  exportDate: Date;
}

/**
 * Custom analytics result structure for dynamic surveys
 */
export interface CalculatedAnalytics {
  totalResponses: number; // Number of unique people who participated
  completionRate: number; // Engagement-based completion rate for dynamic surveys
  averageQuestionsPerUser: number; // Average number of questions each user answered
  engagementLevels: EngagementBreakdown; // How users engaged with the survey
  responseDistribution: { [questionId: string]: QuestionAnalytics };
  timeSeriesData: { date: string; responses: number }[];
  dynamicQuestionStats: DynamicQuestionStats; // Stats specific to AI-generated questions
  lastUpdated: Date;
}

/**
 * Engagement levels for dynamic surveys
 */
export interface EngagementBreakdown {
  highEngagement: number; // Users who answered 3+ questions (%)
  mediumEngagement: number; // Users who answered 2 questions (%)
  lowEngagement: number; // Users who answered 1 question (%)
  noEngagement: number; // Users who answered 0 questions (%)
}

/**
 * Statistics specific to dynamic AI-generated questions
 */
export interface DynamicQuestionStats {
  totalQuestionsGenerated: number; // Total unique questions generated across all users
  averageQuestionsShownPerUser: number; // Average questions each user saw
  mostCommonQuestionPaths: QuestionPath[]; // Most common question sequences
  aiQuestionEffectiveness: number; // How well AI questions performed (engagement rate)
}

/**
 * Question path tracking for dynamic surveys
 */
export interface QuestionPath {
  sequence: string[]; // Array of question IDs in order
  frequency: number; // How many users followed this path
  completionRate: number; // Completion rate for this specific path
}

export class AnalyticsService {
  /**
   * Calculate simplified analytics for a dynamic survey
   */
  async calculateSurveyAnalytics(
    survey: Survey,
    responses: SurveyResponse[]
  ): Promise<CalculatedAnalytics> {
    console.log(`📊 Calculating analytics for survey ${survey.getId()} with ${responses.length} people responding`);

    const totalResponses = responses.length; // Number of unique people who participated
    const dynamicQuestionStats = this.calculateDynamicQuestionStats(survey, responses);
    const responseDistribution = this.calculateResponseDistribution(survey, responses); // Keep question analytics

    return {
      totalResponses,
      completionRate: totalResponses, // Same as total responses for simplicity
      averageQuestionsPerUser: 0, // Not needed anymore
      engagementLevels: { highEngagement: 0, mediumEngagement: 0, lowEngagement: 0, noEngagement: 0 }, // Not needed
      responseDistribution, // Keep this for question analytics
      timeSeriesData: [], // Not needed since we removed trends
      dynamicQuestionStats,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate analytics for a specific question
   */
  async calculateQuestionAnalytics(
    question: Question,
    responses: SurveyResponse[]
  ): Promise<QuestionAnalytics> {
    console.log(`📊 Calculating analytics for question ${question.getId()}`);

    const questionId = question.getId();
    const questionText = question.getText();
    const questionType = question.getType().getValue();
    
    // Get all answers for this question
    const questionResponses = responses
      .map(response => response.getResponses().find(answer => answer.questionId === questionId))
      .filter(answer => answer !== undefined);

    const totalResponses = questionResponses.length;

    let responseDistribution: any = {};
    let averageRating: number | undefined;
    let mostCommonAnswer: string | undefined;
    let textResponseSummary: string[] | undefined;

    if (questionType === QuestionTypeEnum.MULTIPLE_CHOICE || questionType === QuestionTypeEnum.SINGLE_CHOICE) {
      responseDistribution = this.calculateMultipleChoiceDistribution(questionResponses);
      mostCommonAnswer = this.getMostCommonMultipleChoiceAnswer(questionResponses);
    } else if (questionType === QuestionTypeEnum.SCALE) {
      responseDistribution = this.calculateRatingDistribution(questionResponses);
      averageRating = this.calculateAverageRating(questionResponses);
    } else if (questionType === QuestionTypeEnum.TEXT || questionType === QuestionTypeEnum.TEXTAREA) {
      textResponseSummary = this.getTextResponseSummary(questionResponses);
      responseDistribution = { textResponses: textResponseSummary };
    } else if (questionType === QuestionTypeEnum.YES_NO) {
      responseDistribution = this.calculateBooleanDistribution(questionResponses);
    }

    return {
      questionId,
      questionText,
      questionType,
      totalResponses,
      responseDistribution,
      averageRating,
      mostCommonAnswer,
      textResponseSummary
    };
  }

  /**
   * Prepare data for export
   */
  async prepareExportData(
    survey: Survey,
    responses: SurveyResponse[],
    analytics: SurveyAnalytics
  ): Promise<ExportData> {
    return {
      survey,
      responses,
      analytics,
      exportDate: new Date()
    };
  }

  /**
   * Simplified completion rate - just percentage of users who have responses
   */
  private calculateCompletionRate(survey: Survey, responses: SurveyResponse[]): number {
    return responses.length; // Just return the total number of people who responded
  }

  /**
   * Calculate average number of questions each user answered
   */
  private calculateAverageQuestionsPerUser(responses: SurveyResponse[]): number {
    if (responses.length === 0) return 0;

    const totalQuestions = responses.reduce((sum, response) => {
      return sum + response.getResponses().length;
    }, 0);

    return Math.round((totalQuestions / responses.length) * 100) / 100;
  }

  /**
   * Calculate engagement levels for dynamic surveys
   */
  private calculateEngagementLevels(responses: SurveyResponse[]): EngagementBreakdown {
    if (responses.length === 0) {
      return { highEngagement: 0, mediumEngagement: 0, lowEngagement: 0, noEngagement: 0 };
    }

    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let noCount = 0;

    responses.forEach(response => {
      const answeredCount = response.getResponses().length;
      if (answeredCount === 0) noCount++;
      else if (answeredCount === 1) lowCount++;
      else if (answeredCount === 2) mediumCount++;
      else highCount++; // 3+ questions
    });

    const total = responses.length;
    return {
      highEngagement: Math.round((highCount / total) * 100 * 100) / 100,
      mediumEngagement: Math.round((mediumCount / total) * 100 * 100) / 100,
      lowEngagement: Math.round((lowCount / total) * 100 * 100) / 100,
      noEngagement: Math.round((noCount / total) * 100 * 100) / 100
    };
  }

  /**
   * Calculate statistics for dynamic AI-generated questions
   */
  private calculateDynamicQuestionStats(survey: Survey, responses: SurveyResponse[]): DynamicQuestionStats {
    const allQuestionIds = new Set<string>();
    const questionPaths: { [path: string]: number } = {};

    // Collect all unique questions shown to users
    responses.forEach(response => {
      const userResponses = response.getResponses();
      const questionSequence = userResponses.map(r => r.questionId);
      
      // Track unique questions
      questionSequence.forEach(qId => allQuestionIds.add(qId));
      
      // Track question paths
      const pathKey = questionSequence.join(' -> ');
      questionPaths[pathKey] = (questionPaths[pathKey] || 0) + 1;
    });

    // Calculate averages
    const totalQuestionsShown = responses.reduce((sum, response) => 
      sum + response.getResponses().length, 0
    );
    const averageQuestionsShownPerUser = responses.length > 0 
      ? totalQuestionsShown / responses.length 
      : 0;

    // Calculate AI question effectiveness (users who answered 2+ questions)
    const engagedUsers = responses.filter(r => r.getResponses().length >= 2).length;
    const aiQuestionEffectiveness = responses.length > 0 
      ? (engagedUsers / responses.length) * 100 
      : 0;

    // Get most common paths
    const pathEntries = Object.entries(questionPaths);
    const mostCommonPaths = pathEntries
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([sequence, frequency]) => ({
        sequence: sequence.split(' -> '),
        frequency,
        completionRate: 100 // Simplified - all paths that exist are "completed"
      }));

    return {
      totalQuestionsGenerated: allQuestionIds.size,
      averageQuestionsShownPerUser: Math.round(averageQuestionsShownPerUser * 100) / 100,
      mostCommonQuestionPaths: mostCommonPaths,
      aiQuestionEffectiveness: Math.round(aiQuestionEffectiveness * 100) / 100
    };
  }





  /**
   * Calculate response distribution for all questions
   */
  private calculateResponseDistribution(survey: Survey, responses: SurveyResponse[]): { [questionId: string]: QuestionAnalytics } {
    const distribution: { [questionId: string]: QuestionAnalytics } = {};
    const allQuestions = [...survey.getQuestions(), ...(survey.getDynamicQuestions() || [])];

    allQuestions.forEach(question => {
      const questionAnalytics = this.calculateQuestionAnalyticsSync(question, responses);
      distribution[question.getId()] = questionAnalytics;
    });

    return distribution;
  }

  /**
   * Synchronous version of question analytics calculation
   */
  private calculateQuestionAnalyticsSync(question: Question, responses: SurveyResponse[]): QuestionAnalytics {
    const questionId = question.getId();
    const questionText = question.getText();
    const questionType = question.getType().getValue();
    
    const questionResponses = responses
      .map(response => response.getResponses().find(answer => answer.questionId === questionId))
      .filter(answer => answer !== undefined);

    const totalResponses = questionResponses.length;
    let responseDistribution: any = {};
    let averageRating: number | undefined;
    let mostCommonAnswer: string | undefined;
    let textResponseSummary: string[] | undefined;

    if (questionType === QuestionTypeEnum.MULTIPLE_CHOICE || questionType === QuestionTypeEnum.SINGLE_CHOICE) {
      responseDistribution = this.calculateMultipleChoiceDistribution(questionResponses);
      mostCommonAnswer = this.getMostCommonMultipleChoiceAnswer(questionResponses);
    } else if (questionType === QuestionTypeEnum.SCALE) {
      responseDistribution = this.calculateRatingDistribution(questionResponses);
      averageRating = this.calculateAverageRating(questionResponses);
    } else if (questionType === QuestionTypeEnum.TEXT || questionType === QuestionTypeEnum.TEXTAREA) {
      textResponseSummary = this.getTextResponseSummary(questionResponses);
      responseDistribution = { textResponses: textResponseSummary };
    } else if (questionType === QuestionTypeEnum.YES_NO) {
      responseDistribution = this.calculateBooleanDistribution(questionResponses);
    }

    return {
      questionId,
      questionText,
      questionType,
      totalResponses,
      responseDistribution,
      averageRating,
      mostCommonAnswer,
      textResponseSummary
    };
  }

  /**
   * Calculate time series data for response trends
   */
  private calculateTimeSeriesData(responses: SurveyResponse[]): { date: string; responses: number }[] {
    const dailyResponses: { [date: string]: number } = {};

    responses.forEach(response => {
      const submittedAt = response.getSubmittedAt();
      if (submittedAt) {
        const date = submittedAt.toISOString().split('T')[0]; // YYYY-MM-DD format
        dailyResponses[date] = (dailyResponses[date] || 0) + 1;
      }
    });

    return Object.entries(dailyResponses)
      .map(([date, count]) => ({ date, responses: count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate distribution for multiple choice questions
   */
  private calculateMultipleChoiceDistribution(responses: any[]): { [option: string]: number } {
    const distribution: { [option: string]: number } = {};

    responses.forEach(response => {
      if (response?.answer) {
        const answer = typeof response.answer === 'string' ? response.answer : String(response.answer);
        distribution[answer] = (distribution[answer] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Get most common multiple choice answer
   */
  private getMostCommonMultipleChoiceAnswer(responses: any[]): string | undefined {
    const distribution = this.calculateMultipleChoiceDistribution(responses);
    let maxCount = 0;
    let mostCommon: string | undefined;

    Object.entries(distribution).forEach(([option, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = option;
      }
    });

    return mostCommon;
  }

  /**
   * Calculate distribution for rating questions
   */
  private calculateRatingDistribution(responses: any[]): { [rating: string]: number } {
    const distribution: { [rating: string]: number } = {};

    responses.forEach(response => {
      if (response?.answer !== undefined) {
        const rating = String(response.answer);
        distribution[rating] = (distribution[rating] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Calculate average rating
   */
  private calculateAverageRating(responses: any[]): number {
    const ratings = responses
      .map(response => response?.answer)
      .filter(rating => typeof rating === 'number' || !isNaN(Number(rating)))
      .map(rating => Number(rating));

    if (ratings.length === 0) return 0;

    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    return Math.round((sum / ratings.length) * 100) / 100;
  }

  /**
   * Get summary of text responses
   */
  private getTextResponseSummary(responses: any[]): string[] {
    return responses
      .map(response => response?.answer)
      .filter(answer => typeof answer === 'string' && answer.trim().length > 0)
      .slice(0, 10); // Limit to first 10 responses for summary
  }

  /**
   * Calculate distribution for boolean questions
   */
  private calculateBooleanDistribution(responses: any[]): { [option: string]: number } {
    const distribution: { [option: string]: number } = {
      'Yes': 0,
      'No': 0
    };

    responses.forEach(response => {
      if (response?.answer !== undefined) {
        const answer = response.answer;
        if (answer === true || answer === 'true' || answer === 'Yes') {
          distribution['Yes']++;
        } else if (answer === false || answer === 'false' || answer === 'No') {
          distribution['No']++;
        }
      }
    });

    return distribution;
  }
} 