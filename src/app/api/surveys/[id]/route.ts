/**
 * Single Survey API Routes
 * Handles fetching individual surveys for display and answering
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirebaseSurveyRepository } from '../../../../infrastructure/repositories/FirebaseSurveyRepository';
import { AdminFirebaseSurveyRepository } from '../../../../infrastructure/repositories/AdminFirebaseSurveyRepository';
import { SurveyId } from '../../../../domain/survey/value-objects/SurveyId';

const surveyRepository = new AdminFirebaseSurveyRepository();

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
      id: survey.getId(),
      title: survey.getTitle(),
      description: survey.getDescription(),
      goal: survey.getGoal(),
      maxQuestions: survey.getMaxQuestions(),
      targetLanguage: survey.getTargetLanguage(),
      autoTranslate: survey.getAutoTranslate(),
      createdAt: survey.getCreatedAt(),
      updatedAt: survey.getUpdatedAt(),
      isPublished: survey.canBePublished(),
      isActive: survey.getIsActive(),
      questions: survey.getQuestions().map(question => ({
        id: question.getId(),
        text: question.getText(),
        type: question.getType().getValue(),
        options: question.getOptions(),
        isRequired: question.getIsRequired(),
        isAIGenerated: question.getIsAIGenerated(),
        order: question.getOrder()
      })),
      dynamicQuestions: survey.getDynamicQuestions().map(question => ({
        id: question.getId(),
        text: question.getText(),
        type: question.getType().getValue(),
        options: question.getOptions(),
        isRequired: question.getIsRequired(),
        isAIGenerated: question.getIsAIGenerated(),
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