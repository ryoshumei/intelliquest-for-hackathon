/**
 * Suggestion Service Interface
 * Phase 3: Smart input suggestions for survey responses
 */
export interface SuggestionService {
  /**
   * Get real-time suggestions based on current input
   */
  getSuggestions(params: SuggestionRequestParams): Promise<Suggestion[]>;

  /**
   * Get suggestions based on historical data
   */
  getHistoricalSuggestions(
    questionType: string,
    questionText: string,
    limit?: number
  ): Promise<HistoricalSuggestion[]>;

  /**
   * Get AI-powered contextual suggestions
   */
  getAISuggestions(params: AISuggestionParams): Promise<AISuggestion[]>;

  /**
   * Learn from user interactions to improve suggestions
   */
  recordSuggestionInteraction(interaction: SuggestionInteraction): Promise<void>;

  /**
   * Get smart autocomplete suggestions
   */
  getAutocompleteSuggestions(
    input: string,
    context: AutocompleteContext
  ): Promise<AutocompleteSuggestion[]>;

  /**
   * Validate and correct user input
   */
  validateAndCorrect(input: string, expectedType: string): Promise<ValidationResult>;
}

/**
 * Suggestion Request Parameters
 */
export interface SuggestionRequestParams {
  surveyId: string;
  questionId: string;
  questionType: string;
  questionText: string;
  currentInput: string;
  previousAnswers: PreviousAnswer[];
  userContext?: UserContext;
  limit?: number; // Default: 5
}

/**
 * AI Suggestion Parameters
 */
export interface AISuggestionParams {
  surveyGoal: string;
  questionContext: string;
  currentInput: string;
  previousAnswers: PreviousAnswer[];
  targetLanguage?: string;
  suggestionType: SuggestionType;
}

/**
 * Basic Suggestion Interface
 */
export interface Suggestion {
  text: string;
  confidence: number;
  source: SuggestionSource;
  relevance: number;
  type: SuggestionType;
}

/**
 * Historical Suggestion from past responses
 */
export interface HistoricalSuggestion extends Suggestion {
  frequency: number;
  lastUsed: Date;
  popularityScore: number;
}

/**
 * AI-Generated Suggestion
 */
export interface AISuggestion extends Suggestion {
  reasoning?: string;
  contextualRelevance: number;
  creativityScore: number;
}

/**
 * Autocomplete Suggestion
 */
export interface AutocompleteSuggestion {
  suggestion: string;
  matchType: 'prefix' | 'fuzzy' | 'semantic';
  confidence: number;
  category?: string;
}

/**
 * Autocomplete Context
 */
export interface AutocompleteContext {
  questionType: string;
  domain?: string; // e.g., 'medical', 'education', 'business'
  language: string;
  previousTerms?: string[];
}

/**
 * Suggestion Types
 */
export type SuggestionType = 
  | 'completion' | 'alternative' | 'enhancement' | 'correction' | 'example';

/**
 * Suggestion Sources
 */
export type SuggestionSource = 
  | 'historical' | 'ai_generated' | 'template' | 'pattern_matching' | 'collaborative';

/**
 * User Context for personalized suggestions
 */
export interface UserContext {
  userId?: string;
  demographics?: UserDemographics;
  previousSurveys?: string[];
  preferences?: UserPreferences;
  language: string;
}

/**
 * User Demographics for context
 */
export interface UserDemographics {
  ageRange?: string;
  location?: string;
  profession?: string;
  interests?: string[];
}

/**
 * User Preferences
 */
export interface UserPreferences {
  verbosity: 'concise' | 'moderate' | 'detailed';
  tone: 'formal' | 'casual' | 'professional';
  suggestionFrequency: 'minimal' | 'balanced' | 'aggressive';
}

/**
 * Previous Answer for context
 */
export interface PreviousAnswer {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: any;
  answeredAt: Date;
}

/**
 * Suggestion Interaction for learning
 */
export interface SuggestionInteraction {
  suggestionId: string;
  surveyId: string;
  questionId: string;
  suggestion: string;
  action: SuggestionAction;
  timestamp: Date;
  userInput?: string; // What the user actually typed
  context?: any;
}

/**
 * Suggestion Actions
 */
export type SuggestionAction = 
  | 'accepted' | 'rejected' | 'modified' | 'ignored' | 'partially_used';

/**
 * Input Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  originalInput: string;
  correctedInput?: string;
  suggestions?: string[];
  validationErrors?: ValidationError[];
  confidence: number;
}

/**
 * Validation Error
 */
export interface ValidationError {
  type: 'spelling' | 'grammar' | 'format' | 'content';
  message: string;
  suggestion?: string;
  position?: { start: number; end: number };
}

/**
 * Suggestion Performance Metrics
 */
export interface SuggestionMetrics {
  totalSuggestions: number;
  acceptanceRate: number;
  averageResponseTime: number;
  topSuggestionSources: SuggestionSourceMetric[];
  userSatisfactionScore: number;
  improvementRate: number; // How suggestions improve over time
}

/**
 * Suggestion Source Metrics
 */
export interface SuggestionSourceMetric {
  source: SuggestionSource;
  count: number;
  acceptanceRate: number;
  averageConfidence: number;
}

/**
 * Suggestion Configuration
 */
export interface SuggestionConfig {
  maxSuggestions: number;
  minConfidence: number;
  enableAISuggestions: boolean;
  enableHistoricalSuggestions: boolean;
  debounceTime: number; // milliseconds
  cacheTimeout: number; // minutes
  personalizeResults: boolean;
}

/**
 * Suggestion Analytics
 */
export interface SuggestionAnalytics {
  surveyId: string;
  questionId: string;
  totalInteractions: number;
  suggestionMetrics: SuggestionMetrics;
  popularSuggestions: PopularSuggestion[];
  userEngagement: UserEngagementMetrics;
  performanceTrends: SuggestionTrend[];
}

/**
 * Popular Suggestion
 */
export interface PopularSuggestion {
  text: string;
  usageCount: number;
  acceptanceRate: number;
  averageRating?: number;
}

/**
 * User Engagement Metrics
 */
export interface UserEngagementMetrics {
  averageInteractionTime: number;
  suggestionClickRate: number;
  completionImprovementRate: number;
  userRetentionRate: number;
}

/**
 * Suggestion Trend
 */
export interface SuggestionTrend {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  changePercentage: number;
  timeFrame: string;
}

/**
 * Suggestion Cache Entry
 */
export interface SuggestionCacheEntry {
  key: string;
  suggestions: Suggestion[];
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
} 