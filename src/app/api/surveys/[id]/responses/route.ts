/**
 * Survey Response API Routes
 * Handles submission and retrieval of survey responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { SubmitSurveyResponseUseCase, SubmitResponseParams } from '../../../../../application/use-cases/SubmitSurveyResponseUseCase';
import { FirebaseSurveyRepository } from '../../../../../infrastructure/repositories/FirebaseSurveyRepository';
import { AdminFirebaseSurveyRepository } from '../../../../../infrastructure/repositories/AdminFirebaseSurveyRepository';
import { FirebaseSurveyResponseRepository } from '../../../../../infrastructure/repositories/FirebaseSurveyResponseRepository';
import { AdminFirebaseSurveyResponseRepository } from '../../../../../infrastructure/repositories/AdminFirebaseSurveyResponseRepository';
import { MockEventBus } from '../../../../../infrastructure/services/MockEventBus';

// Initialize dependencies
const surveyRepository = new AdminFirebaseSurveyRepository();
const responseRepository = new AdminFirebaseSurveyResponseRepository();
const eventBus = new MockEventBus();
const submitResponseUseCase = new SubmitSurveyResponseUseCase(
  surveyRepository,
  responseRepository,
  eventBus
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyId = id;
    const body = await request.json();

    // Validate request body
    if (!body.responses || !Array.isArray(body.responses)) {
      return NextResponse.json(
        { error: 'Responses array is required' },
        { status: 400 }
      );
    }

    // Get client metadata
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Prepare submission parameters
    const submitParams: SubmitResponseParams = {
      surveyId,
      responses: body.responses,
      respondentId: body.respondentId,
      respondentEmail: body.respondentEmail,
      metadata: {
        ipAddress: clientIP,
        userAgent,
        ...body.metadata
      }
    };

    // Execute use case
    const result = await submitResponseUseCase.execute(submitParams);

    if (result.success) {
      return NextResponse.json({
        success: true,
        responseId: result.responseId,
        message: result.message
      }, { status: 201 });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in survey response API:', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyId = id;
    
    // Get responses for this survey
    const responses = await responseRepository.findBySurveyId(surveyId);
    
    // Convert to API response format
    const responseData = responses.map(response => ({
      id: response.getId().getValue(),
      surveyId: response.getSurveyId().getValue(),
      respondentId: response.getRespondentId(),
      respondentEmail: response.getRespondentEmail(),
      responses: response.getResponses(),
      startedAt: response.getStartedAt(),
      submittedAt: response.getSubmittedAt(),
      isComplete: response.isComplete(),
      responseCount: response.getResponseCount()
    }));

    return NextResponse.json({
      success: true,
      responses: responseData,
      count: responseData.length
    });

  } catch (error) {
    console.error('❌ Error fetching survey responses:', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch responses' 
      },
      { status: 500 }
    );
  }
} 