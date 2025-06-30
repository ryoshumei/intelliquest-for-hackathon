import { NextRequest, NextResponse } from 'next/server';
import { AdminFirebaseSurveyRepository } from '@/infrastructure/repositories/AdminFirebaseSurveyRepository';
import { AdminFirebaseSurveyResponseRepository } from '@/infrastructure/repositories/AdminFirebaseSurveyResponseRepository';
import { SurveyId } from '@/domain/survey/value-objects/SurveyId';
import { withAuth, requireUser } from '@/lib/auth/withAuth';

export const GET = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: surveyId } = await params;
    console.log(`📥 GET /api/surveys/${surveyId}/export`);

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      );
    }

    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: csv, json' },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const user = requireUser(request);
    
    // Initialize repositories with the authenticated user's ID
    const surveyRepository = new AdminFirebaseSurveyRepository(user.getId());
    const responseRepository = new AdminFirebaseSurveyResponseRepository();

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
    console.log(`📥 Found ${responses.length} responses for export`);

    if (responses.length === 0) {
      return NextResponse.json(
        { error: 'No responses found for this survey' },
        { status: 404 }
      );
    }

    const surveyTitle = survey.getTitle();
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Encode filename to handle Unicode characters
    const safeFilename = encodeURIComponent(`${surveyTitle}_responses_${timestamp}`);

    if (format === 'csv') {
      // Generate CSV content
      const csvContent = generateCSV(survey, responses);
      
      // Return CSV content directly as string
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.csv"; filename*=UTF-8''${safeFilename}.csv`
        }
      });

    } else if (format === 'json') {
      // Generate JSON export
      const jsonData = generateJSON(survey, responses);
      
      // Return JSON content directly as string
      const jsonString = JSON.stringify(jsonData, null, 2);
      
      return new NextResponse(jsonString, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.json"; filename*=UTF-8''${safeFilename}.json`
        }
      });
    }

    // This should never be reached due to format validation above, but ensures type safety
    return NextResponse.json(
      { error: 'Unsupported format' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Error exporting survey data:', error);
    return NextResponse.json(
      { error: 'Failed to export survey data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

function generateCSV(survey: any, responses: any[]): string {
  if (!responses || responses.length === 0) {
    return '\uFEFF' + 'No responses found';
  }

  // Get all questions from the survey
  const questions = survey.getQuestions() || [];
  const dynamicQuestions = survey.getDynamicQuestions() || [];
  const allQuestions = [...questions, ...dynamicQuestions];

  // Create headers
  const headers = [
    'Response ID',
    'Submitted At',
    'User ID',
    'Language',
    'Completion Time (minutes)',
    ...allQuestions.map((q: any) => q.text || q.getQuestion?.() || `Question ${q.id}`)
  ];

  // Generate rows
  const rows = responses.map((response: any) => {
    const responseData = response.toData ? response.toData() : response;
    const submittedAt = responseData.submittedAt ? new Date(responseData.submittedAt.seconds * 1000).toISOString() : '';
    const completionTime = responseData.completionTime ? Math.round(responseData.completionTime / 60000) : '';
    
    const row = [
      responseData.id || '',
      submittedAt,
      responseData.userId || '',
      responseData.language || '',
      completionTime.toString()
    ];

    // Add answers for each question
    allQuestions.forEach((question: any) => {
      const questionId = question.id || question.getId?.();
      const answer = responseData.responses?.[questionId] || '';
      row.push(typeof answer === 'object' ? JSON.stringify(answer) : String(answer));
    });

    return row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  // Add BOM for proper UTF-8 encoding in Excel and other programs
  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

function generateJSON(survey: any, responses: any[]): any {
  console.log('📊 Generating JSON data...');

  if (responses.length === 0) {
    return { error: 'No responses available for export' };
  }

  const surveyData = survey.toData ? survey.toData() : survey;
  const responsesData = responses.map(response => 
    response.toData ? response.toData() : response
  );

  return {
    survey: {
      id: surveyData.id,
      title: surveyData.title,
      description: surveyData.description,
      targetLanguage: surveyData.targetLanguage,
      questions: surveyData.questions,
      dynamicQuestions: surveyData.dynamicQuestions,
      createdAt: surveyData.createdAt,
      updatedAt: surveyData.updatedAt
    },
    responses: responsesData,
    metadata: {
      totalResponses: responses.length,
      exportedAt: new Date().toISOString(),
      format: 'json'
    }
  };
} 