import { NextRequest, NextResponse } from 'next/server';
import { CreateSurveyUseCase, CreateSurveyRequest } from '@/application/use-cases/CreateSurveyUseCase';
import { DomainError } from '@/domain/shared/errors/DomainError';
import { withAuth, withRole, requireUser } from '@/lib/auth/withAuth';

// Repository and service implementations
import { FirebaseSurveyRepository } from '@/infrastructure/repositories/FirebaseSurveyRepository';
// import { MockSurveyRepository } from '@/infrastructure/repositories/MockSurveyRepository';
import { VertexAIQuestionGeneratorService } from '@/infrastructure/external-services/VertexAIQuestionGeneratorService';
import { MockAIQuestionGeneratorService } from '@/infrastructure/external-services/MockAIQuestionGeneratorService';
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
      userId: user.getId(), // Use authenticated user's ID
      useAI: body.useAI || false,
      aiGenerationParams: body.aiGenerationParams,
      questions: body.questions || []
    };

    // Initialize dependencies with real Firebase repository and Vertex AI
    const surveyRepository = new FirebaseSurveyRepository(user.getId());
    
    // Use Vertex AI in production, Mock for fallback
    let aiService;
    try {
      aiService = new VertexAIQuestionGeneratorService();
      console.log('✅ Using Vertex AI Question Generator Service');
    } catch (error) {
      console.warn('⚠️ Vertex AI initialization failed, falling back to Mock service:', error);
      aiService = new MockAIQuestionGeneratorService();
    }
    
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
    
    // Initialize Firebase repository with user context
    const surveyRepository = new FirebaseSurveyRepository(user.getId());
    
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
    
    // Transform to API response format
    const surveys = result.surveys.map(survey => ({
      id: survey.getId(),
      title: survey.getTitle(),
      description: survey.getDescription(),
      questionCount: survey.getQuestionCount(),
      isActive: survey.getIsActive(),
      createdAt: survey.getCreatedAt().toISOString(),
      updatedAt: survey.getUpdatedAt().toISOString(),
      userId: user.getId()
    }));

    return NextResponse.json({
      surveys,
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