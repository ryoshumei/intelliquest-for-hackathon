import { NextRequest, NextResponse } from 'next/server';
import { AdminFirebaseSurveyRepository } from '@/infrastructure/repositories/AdminFirebaseSurveyRepository';
import { VertexAIQuestionGeneratorService } from '@/infrastructure/external-services/VertexAIQuestionGeneratorService';
import { GenerateDynamicQuestionUseCase } from '@/application/use-cases/GenerateDynamicQuestionUseCase';

/**
 * POST /api/surveys/[id]/dynamic-questions
 * Phase 3: Generate dynamic questions based on previous answers
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params
    const params = await context.params;
    
    // Parse request body
    const body = await request.json();
    const { previousAnswers, currentQuestionIndex, questionCount = 1, surveyGoal, maxQuestions, targetLanguage } = body;

    // Validate required parameters
    if (!previousAnswers || !Array.isArray(previousAnswers)) {
      return NextResponse.json(
        { error: 'Previous answers are required and must be an array' },
        { status: 400 }
      );
    }

    if (typeof currentQuestionIndex !== 'number' || currentQuestionIndex < 0) {
      return NextResponse.json(
        { error: 'Current question index must be a non-negative number' },
        { status: 400 }
      );
    }

    // Initialize AI service only (no database operations needed)
    const aiQuestionGenerator = new VertexAIQuestionGeneratorService();

    // Prepare AI generation parameters
    const generationParams = {
      surveyId: params.id,
      surveyGoal: surveyGoal || 'Understanding user preferences',
      previousAnswers,
      currentQuestionIndex,
      maxQuestions: maxQuestions || 10,
      targetLanguage: targetLanguage || 'en',
      questionCount: Math.min(questionCount, 10) // Limit to max 10 questions at once
    };

    try {
      // Generate dynamic questions using AI (no database save)
      if (questionCount === 1) {
        // Generate single dynamic question
        const dynamicQuestion = await aiQuestionGenerator.generateDynamicQuestion(generationParams);

        return NextResponse.json({
          success: true,
          question: dynamicQuestion.toPlainObject(),
          message: 'Dynamic question generated successfully'
        });
      } else {
        // Generate multiple dynamic questions
        const dynamicQuestions = await aiQuestionGenerator.generateDynamicQuestions(generationParams);

        return NextResponse.json({
          success: true,
          questions: dynamicQuestions.map(q => q.toPlainObject()),
          requestedCount: questionCount,
          generatedCount: dynamicQuestions.length,
          message: 'Dynamic questions generated successfully'
        });
      }
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      return NextResponse.json(
        { 
          error: 'Failed to generate dynamic questions',
          details: aiError instanceof Error ? aiError.message : 'AI service error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in dynamic questions API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/surveys/[id]/dynamic-questions
 * Phase 3: Clear dynamic questions (frontend-managed, returns success)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Since dynamic questions are now managed by frontend, 
    // this endpoint just returns success
    return NextResponse.json({
      success: true,
      message: 'Dynamic questions cleared (frontend-managed)',
      clearedCount: 0
    });

  } catch (error) {
    console.error('Error in DELETE dynamic questions:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 