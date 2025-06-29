import { NextRequest, NextResponse } from 'next/server';
import { AdminFirebaseSurveyRepository } from '@/infrastructure/repositories/AdminFirebaseSurveyRepository';
import { AdminFirebaseSurveyResponseRepository } from '@/infrastructure/repositories/AdminFirebaseSurveyResponseRepository';
import { AnalyticsService } from '@/application/services/AnalyticsService';
import { SurveyId } from '@/domain/survey/value-objects/SurveyId';
import { withAuth, requireUser } from '@/lib/auth/withAuth';

export const GET = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: surveyId } = await params;
    console.log(`📊 GET /api/surveys/${surveyId}/analytics`);

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const user = requireUser(request);
    
    // Initialize repositories with the authenticated user's ID
    const surveyRepository = new AdminFirebaseSurveyRepository(user.getId());
    const responseRepository = new AdminFirebaseSurveyResponseRepository();
    const analyticsService = new AnalyticsService();

    // Get survey data
    const survey = await surveyRepository.findById(SurveyId.fromString(surveyId));
    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Get all responses for this survey
    const responses = await responseRepository.findBySurveyId(surveyId);
    console.log(`📊 Found ${responses.length} responses for survey ${surveyId}`);

    // Calculate analytics
    const analytics = await analyticsService.calculateSurveyAnalytics(survey, responses);

    return NextResponse.json({
      success: true,
      analytics,
      surveyId,
      surveyTitle: survey.getTitle(),
      totalQuestions: survey.getQuestions().length + (survey.getDynamicQuestions()?.length || 0)
    });

  } catch (error) {
    console.error('❌ Error fetching survey analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}); 