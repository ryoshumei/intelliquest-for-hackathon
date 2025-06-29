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
import { adminFirestore } from '@/lib/firebase-admin';

// Initialize dependencies - will create instances per request with proper context

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

    // First get the survey to find the owner
    const readOnlySurveyRepo = new AdminFirebaseSurveyRepository();
    const survey = await readOnlySurveyRepo.findByIdString(surveyId);
    
    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // If dynamic questions are provided, update the survey with them
    if (body.dynamicQuestions && body.dynamicQuestions.length > 0) {
      try {
        // Use survey's owner ID for saving dynamic questions
        const surveyDoc = await adminFirestore.collection('surveys').doc(surveyId).get();
        const surveyOwnerId = surveyDoc.data()?.ownerId || 'system';
        const surveyRepositoryWithOwner = new AdminFirebaseSurveyRepository(surveyOwnerId);
        
        if (survey) {
          // Get survey's target language and user's language from metadata
          const surveyTargetLanguage = survey.getTargetLanguage();
          const userLanguage = body.metadata?.userLanguage || 'en';
          const translationApplied = body.metadata?.translationApplied || false;
          
          console.log(`🌍 Survey target language: ${surveyTargetLanguage}, User language: ${userLanguage}, Translation applied: ${translationApplied}`);

          // Add dynamic questions to the survey
          for (const dq of body.dynamicQuestions) {
            let questionText = dq.text;
            let questionOptions = dq.options || [];
            
            // Only translate if translation wasn't already applied on the frontend
            if (!translationApplied && surveyTargetLanguage && userLanguage !== surveyTargetLanguage) {
              // Initialize translation service for dynamic question translation
              const { GoogleTranslationService } = await import('@/infrastructure/external-services/GoogleTranslationService');
              const translationService = new GoogleTranslationService();
              
              if (translationService.isAvailable()) {
                try {
                  console.log(`🔄 Translating dynamic question from ${userLanguage} to ${surveyTargetLanguage}`);
                  console.log(`📝 Original question: ${questionText}`);
                  
                  // Translate question text
                  questionText = await translationService.translateText(
                    dq.text, 
                    surveyTargetLanguage, 
                    userLanguage
                  );
                  
                  console.log(`✅ Translated question: ${questionText}`);
                  
                  // Translate options if they exist
                  if (dq.options && dq.options.length > 0) {
                    questionOptions = await translationService.translateBatch(
                      dq.options,
                      surveyTargetLanguage,
                      userLanguage
                    );
                    console.log(`✅ Translated options: ${questionOptions.join(', ')}`);
                  }
                } catch (translationError) {
                  console.error('⚠️ Failed to translate dynamic question:', translationError);
                  // Continue with original text if translation fails
                  questionText = dq.text;
                  questionOptions = dq.options || [];
                }
              }
            } else {
              console.log(`ℹ️ Using already translated content or no translation needed`);
            }
            
            const question = {
              id: dq.id,
              text: questionText,
              type: dq.type,
              options: questionOptions,
              isRequired: false,
              isAIGenerated: true,
              order: survey.getQuestions().length + survey.getDynamicQuestions().length + 1,
              createdAt: new Date(),
              // Store translation metadata
              originalText: dq.originalText || dq.text,
              originalLanguage: dq.originalLanguage || userLanguage,
              translatedToLanguage: translationApplied ? dq.translatedToLanguage : surveyTargetLanguage,
              translationApplied: translationApplied || (questionText !== dq.text)
            };
            
            // Import Question class
            const { Question } = await import('@/domain/survey/entities/Question');
            const { QuestionType } = await import('@/domain/survey/value-objects/QuestionType');
            
            const dynamicQuestion = Question.fromPersistence(
              question.id,
              question.text,
              QuestionType.fromString(question.type),
              question.options,
              question.isRequired,
              question.isAIGenerated,
              question.order,
              question.createdAt
            );
            
            survey.addDynamicQuestion(dynamicQuestion);
          }
          
          // Save the updated survey with dynamic questions
          await surveyRepositoryWithOwner.save(survey);
          console.log('✅ Saved', body.dynamicQuestions.length, 'dynamic questions to survey');
        }
      } catch (error) {
        console.error('⚠️ Failed to save dynamic questions:', error);
        // Continue with response submission even if dynamic questions save fails
      }
    }

    // Initialize dependencies for response submission
    const responseRepository = new AdminFirebaseSurveyResponseRepository();
    const eventBus = new MockEventBus();
    const submitResponseUseCase = new SubmitSurveyResponseUseCase(
      readOnlySurveyRepo,
      responseRepository,
      eventBus
    );

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
    
    // Initialize repository for fetching responses
    const responseRepository = new AdminFirebaseSurveyResponseRepository();
    
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