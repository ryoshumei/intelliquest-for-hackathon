/**
 * Analytics Service Interface
 * Phase 3: Comprehensive analytics and reporting for survey makers
 */
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
  responseCount: number;
  skipRate: number;
  averageResponseTime: number;
  responseDistribution: ResponseDistribution;
  sentimentAnalysis?: SentimentData; // For text questions
  wordCloud?: WordCloudData; // For text questions
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