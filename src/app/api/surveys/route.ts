import { NextRequest, NextResponse } from 'next/server';
import { CreateSurveyUseCase, CreateSurveyRequest } from '@/application/use-cases/CreateSurveyUseCase';
import { DomainError } from '@/domain/shared/errors/DomainError';
import { withAuth, withRole, requireUser } from '@/lib/auth/withAuth';

// This will be injected via DI container in a real implementation
// For now, we'll use placeholder implementations
import { MockSurveyRepository } from '@/infrastructure/repositories/MockSurveyRepository';
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

    // Initialize dependencies (in real app, this would be via DI container)
    const surveyRepository = new MockSurveyRepository();
    const aiService = new MockAIQuestionGeneratorService();
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
    
    // This is a placeholder - would implement GetSurveysUseCase
    // In real implementation, filter surveys by user.getId()
    const surveys = [
      {
        id: 'survey_demo_123',
        title: 'Demo Survey',
        description: 'A demo survey created with IntelliQuest',
        questionCount: 3,
        isActive: true,
        createdAt: new Date().toISOString(),
        userId: user.getId()
      }
    ];

    return NextResponse.json({ surveys });
  } catch (error) {
    console.error('Get surveys error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surveys' },
      { status: 500 }
    );
  }
} 

// Export protected handlers
export const POST = withRole(['surveys:create'], createSurvey);
export const GET = withAuth(getSurveys); 