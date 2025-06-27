/**
 * Single Survey API Routes
 * Handles fetching individual surveys for display and answering
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirebaseSurveyRepository } from '../../../../infrastructure/repositories/FirebaseSurveyRepository';
import { SurveyId } from '../../../../domain/survey/value-objects/SurveyId';

const surveyRepository = new FirebaseSurveyRepository();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyId = SurveyId.create(id);
    const survey = await surveyRepository.findById(surveyId);

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Convert to API response format
    const surveyData = {
      id: survey.getId().getValue(),
      title: survey.getTitle(),
      description: survey.getDescription(),
      createdBy: survey.getCreatedBy(),
      createdAt: survey.getCreatedAt(),
      updatedAt: survey.getUpdatedAt(),
      isPublished: survey.isPublished(),
      questions: survey.getQuestions().map(question => ({
        id: question.getId().getValue(),
        text: question.getText(),
        type: question.getType().getValue(),
        options: question.getOptions(),
        isRequired: question.isRequired(),
        order: question.getOrder()
      }))
    };

    return NextResponse.json({
      success: true,
      survey: surveyData
    });

  } catch (error) {
    console.error('❌ Error fetching survey:', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch survey' 
      },
      { status: 500 }
    );
  }
} 