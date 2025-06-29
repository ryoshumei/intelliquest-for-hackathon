'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Updated analytics structure for dynamic surveys
interface ActualAnalytics {
  totalResponses: number; // Number of unique people who participated
  completionRate: number; // Engagement-based completion rate
  averageQuestionsPerUser: number; // Average questions each user answered
  engagementLevels: {
    highEngagement: number; // Users who answered 3+ questions (%)
    mediumEngagement: number; // Users who answered 2 questions (%)
    lowEngagement: number; // Users who answered 1 question (%)
    noEngagement: number; // Users who answered 0 questions (%)
  };
  responseDistribution?: { [questionId: string]: any };
  timeSeriesData: { date: string; responses: number }[];
  dynamicQuestionStats: {
    totalQuestionsGenerated: number;
    averageQuestionsShownPerUser: number;
    aiQuestionEffectiveness: number;
  };
  lastUpdated: string;
}

interface AnalyticsOverviewProps {
  analytics: ActualAnalytics;
}

export function AnalyticsOverview({ analytics }: AnalyticsOverviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Total Responses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="m22 21-3-3" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {analytics.totalResponses}
          </div>
          <p className="text-xs text-muted-foreground">
            {analytics.totalResponses === 1 ? 'person responded' : 'people responded'}
          </p>
        </CardContent>
      </Card>

      {/* AI Questions Generated */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Questions Generated</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {analytics.dynamicQuestionStats.totalQuestionsGenerated}
          </div>
          <p className="text-xs text-muted-foreground">
            Unique AI questions created
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 