import { NextRequest, NextResponse } from 'next/server';
import { CreateSurveyUseCase, CreateSurveyRequest } from '@/application/use-cases/CreateSurveyUseCase';
import { DomainError } from '@/domain/shared/errors/DomainError';
import { withAuth, withRole, requireUser } from '@/lib/auth/withAuth';

// Repository and service implementations
import { FirebaseSurveyRepository } from '@/infrastructure/repositories/FirebaseSurveyRepository';
import { AdminFirebaseSurveyRepository } from '@/infrastructure/repositories/AdminFirebaseSurveyRepository';
import { FirebaseSurveyResponseRepository } from '@/infrastructure/repositories/FirebaseSurveyResponseRepository';
import { AdminFirebaseSurveyResponseRepository } from '@/infrastructure/repositories/AdminFirebaseSurveyResponseRepository';

import { VertexAIQuestionGeneratorService } from '@/infrastructure/external-services/VertexAIQuestionGeneratorService';
import { MockEventBus } from '@/infrastructure/services/MockEventBus';
import {
  EmailNotificationHandler,
  StatisticsUpdateHandler,
  AuditLogHandler,
  CacheInvalidationHandler
} from '@/application/event-handlers/SurveyEventHandlers';

/**
 * POST /api/surveys - Create a new survey
 * Protected route: requires authentication and survey creation permission
 */
async function createSurvey(request: NextRequest) {
  try {
    // Get authenticated user
    const user = requireUser(request);
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create request DTO using authenticated user ID
    const createSurveyRequest: CreateSurveyRequest = {
      title: body.title,
      description: body.description || '',
      goal: body.goal || '', // Phase 3: Survey goal
      maxQuestions: body.maxQuestions || 10, // Phase 3: Max questions
      targetLanguage: body.targetLanguage || 'en', // Phase 3: Target language
      autoTranslate: body.autoTranslate || false, // Phase 3: Auto-translate
      userId: user.getId(), // Use authenticated user's ID
      useAI: body.useAI || false,
      aiGenerationParams: body.aiGenerationParams,
      questions: body.questions || []
    };

    // Initialize dependencies with Admin Firebase repository and Vertex AI
    const surveyRepository = new AdminFirebaseSurveyRepository(user.getId());
    
    // Use Vertex AI for question generation
    const aiService = new VertexAIQuestionGeneratorService();
    console.log('✅ Using Vertex AI Question Generator Service');
    
    const eventBus = new MockEventBus();

    // Register event handlers to demonstrate EventBus functionality
    const emailHandler = new EmailNotificationHandler();
    const statsHandler = new StatisticsUpdateHandler();
    const auditHandler = new AuditLogHandler();
    const cacheHandler = new CacheInvalidationHandler();

    eventBus.subscribe('SurveyCreated', emailHandler);
    eventBus.subscribe('SurveyCreated', statsHandler);
    eventBus.subscribe('SurveyCreated', auditHandler);
    eventBus.subscribe('SurveyCreated', cacheHandler);

    console.log(`🚌 EventBus: Registered ${eventBus.getHandlerCount('SurveyCreated')} handlers for SurveyCreated event`);

    // Create use case
    const createSurveyUseCase = new CreateSurveyUseCase(
      surveyRepository,
      aiService,
      eventBus
    );

    // Execute use case
    const result = await createSurveyUseCase.execute(createSurveyRequest);

    // Return success response
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Survey creation error:', error);

    if (error instanceof DomainError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          type: 'domain_error'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/surveys - Get surveys list (placeholder)
 * Protected route: requires authentication and survey read permission
 */
async function getSurveys(request: NextRequest) {
  try {
    // Get authenticated user
    const user = requireUser(request);
    
    // Initialize Firebase repositories (use Admin SDK for server-side operations)
    const surveyRepository = new AdminFirebaseSurveyRepository(user.getId());
    const responseRepository = new AdminFirebaseSurveyResponseRepository();
    
    // Get query parameters for pagination
    const url = new URL(request.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const isActive = url.searchParams.get('isActive');
    
    // Build filters
    const filters = {
      userId: user.getId(),
      ...(isActive !== null && { isActive: isActive === 'true' })
    };
    
    // Fetch surveys with pagination
    const result = await surveyRepository.findWithPagination(offset, limit, filters);
    
    // Transform to API response format and get response counts
    const surveysWithCounts = await Promise.all(
      result.surveys.map(async (survey) => {
        try {
          // Get response count for each survey
          const responses = await responseRepository.findBySurveyId(survey.getId());
          const responseCount = responses.length;
          
          const createdAt = survey.getCreatedAt();
          const updatedAt = survey.getUpdatedAt();
          
          return {
            id: survey.getId(),
            title: survey.getTitle(),
            description: survey.getDescription(),
            questionCount: survey.getTotalQuestionCount(),
            isActive: survey.getIsActive(),
            createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
            updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : new Date(updatedAt).toISOString(),
            userId: user.getId(),
            responseCount
          };
        } catch (error) {
          console.warn(`Failed to get response count for survey ${survey.getId()}:`, error);
          // Return survey without response count if there's an error
          const createdAt = survey.getCreatedAt();
          const updatedAt = survey.getUpdatedAt();
          
          return {
            id: survey.getId(),
            title: survey.getTitle(),
            description: survey.getDescription(),
            questionCount: survey.getTotalQuestionCount(),
            isActive: survey.getIsActive(),
            createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
            updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : new Date(updatedAt).toISOString(),
            userId: user.getId(),
            responseCount: 0
          };
        }
      })
    );

    return NextResponse.json({
      surveys: surveysWithCounts,
      pagination: {
        offset,
        limit,
        total: result.total,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('Get surveys error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch surveys',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 

// Export protected handlers
export const POST = withRole(['surveys:create'], createSurvey);
export const GET = withAuth(getSurveys); 