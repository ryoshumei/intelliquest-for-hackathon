'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionAnalytics } from '@/application/services/AnalyticsService';
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview';
import { QuestionAnalyticsCard } from '@/components/analytics/QuestionAnalyticsCard';
import { ExportButton } from '@/components/analytics/ExportButton';
import { useAuth } from '@/app/contexts/AuthContext';

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
  responseDistribution: { [questionId: string]: QuestionAnalytics };
  timeSeriesData: { date: string; responses: number }[];
  dynamicQuestionStats: {
    totalQuestionsGenerated: number;
    averageQuestionsShownPerUser: number;
    aiQuestionEffectiveness: number;
  };
  lastUpdated: string;
}

interface AnalyticsData {
  analytics: ActualAnalytics;
  surveyId: string;
  surveyTitle: string;
  totalQuestions: number;
}

export default function SurveyAnalyticsPage() {
  const params = useParams();
  const surveyId = params.id as string;
  const { getToken } = useAuth();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [surveyId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching analytics for survey:', surveyId);

      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(`/api/surveys/${surveyId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          console.warn('🚨 Authentication failed, redirecting to login');
          window.location.href = '/auth/login';
          return;
        }
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      if (data.success) {
        setAnalyticsData(data);
        console.log('✅ Analytics data loaded:', data);
      } else {
        throw new Error(data.error || 'Failed to load analytics');
      }

    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchAnalytics}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>No Analytics Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No analytics data available for this survey.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { analytics, surveyTitle, totalQuestions } = analyticsData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Survey Analytics</h1>
              <p className="text-lg text-gray-600 mt-1">{surveyTitle}</p>
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <Badge variant="secondary" className="text-sm py-1">
                  {analytics.totalResponses} people responded
                </Badge>
                <Badge variant="outline" className="text-sm py-1">
                  {analytics.dynamicQuestionStats.totalQuestionsGenerated} AI questions generated
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <ExportButton surveyId={surveyId} format="csv" />
              <ExportButton surveyId={surveyId} format="json" />
              <Button variant="outline" onClick={fetchAnalytics}>
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          <Tabs defaultValue="overview" className="w-full">
            <div className="border-b px-6 pt-6">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6 space-y-6">
              <AnalyticsOverview analytics={analytics} />
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions" className="p-6 space-y-6">
              <div className="grid gap-6">
                {analytics.responseDistribution && Object.entries(analytics.responseDistribution).map(([questionId, questionAnalytics]) => (
                  <QuestionAnalyticsCard 
                    key={questionId} 
                    analytics={questionAnalytics} 
                  />
                ))}
                {(!analytics.responseDistribution || Object.keys(analytics.responseDistribution).length === 0) && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500">No question analytics available yet.</p>
                      <p className="text-sm text-gray-400 mt-2">Questions will appear here once responses are collected.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>


          </Tabs>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-lg shadow-sm border mt-6">
          <div className="p-6 text-center text-sm text-gray-500">
            Analytics last updated: {new Date(analytics.lastUpdated).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
} 