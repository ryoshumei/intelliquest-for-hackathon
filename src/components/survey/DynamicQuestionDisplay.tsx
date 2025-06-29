'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Brain, 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Lightbulb
} from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  isRequired: boolean;
  isAIGenerated: boolean;
  order: number;
}

interface PreviousAnswer {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string | number | string[] | boolean;
  answeredAt: Date;
}

interface Props {
  surveyId: string;
  previousAnswers: PreviousAnswer[];
  currentQuestionIndex: number;
  onQuestionsGenerated: (questions: Question[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface GenerationState {
  isGenerating: boolean;
  canGenerate: boolean;
  totalQuestions: number;
  generatedCount: number;
  error?: string;
}

export function DynamicQuestionDisplay({
  surveyId,
  previousAnswers,
  currentQuestionIndex,
  onQuestionsGenerated,
  onError,
  className = ''
}: Props) {
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    canGenerate: true,
    totalQuestions: 0,
    generatedCount: 0
  });

  const [autoGenerate, setAutoGenerate] = useState(true);

  // Auto-generate questions when answers are provided
  useEffect(() => {
    if (autoGenerate && previousAnswers.length > 0 && generationState.canGenerate && !generationState.isGenerating) {
      handleGenerateQuestion();
    }
  }, [previousAnswers.length, autoGenerate, generationState.canGenerate, generationState.isGenerating]);

  const handleGenerateQuestion = async (count: number = 1) => {
    if (generationState.isGenerating) return;

    setGenerationState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      error: undefined 
    }));

    try {
      const response = await fetch(`/api/surveys/${surveyId}/dynamic-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyGoal: 'Understanding user preferences',
          previousAnswers,
          currentQuestionIndex,
          questionCount: count,
          maxQuestions: 10,
          targetLanguage: 'en'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      if (data.success) {
        const questions = count === 1 ? [data.question] : data.questions;
        onQuestionsGenerated(questions);
        
        setGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          canGenerate: data.canGenerateMore,
          totalQuestions: data.totalQuestions,
          generatedCount: prev.generatedCount + (count === 1 ? 1 : data.generatedCount)
        }));
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating dynamic questions:', error);
      
      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));
      
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const handleRegenerateQuestions = async () => {
    setGenerationState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      error: undefined 
    }));

    try {
      const response = await fetch(`/api/surveys/${surveyId}/dynamic-questions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updatedAnswers: previousAnswers,
          currentQuestionIndex,
          desiredCount: 2 // Regenerate a couple of questions
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate questions');
      }

      if (data.success) {
        onQuestionsGenerated(data.questions);
        
        setGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          generatedCount: data.newDynamicCount
        }));
      } else {
        throw new Error(data.error || 'Regeneration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error regenerating questions:', error);
      
      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));
      
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const getProgressPercentage = () => {
    if (generationState.totalQuestions === 0) return 0;
    return (currentQuestionIndex / generationState.totalQuestions) * 100;
  };

  const shouldShowGenerator = previousAnswers.length > 0;

  if (!shouldShowGenerator) {
    return null;
  }

  return (
    <Card className={`w-full border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          AI Dynamic Questions
          <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700">
            Smart Survey
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Indicator */}
        {generationState.totalQuestions > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Survey Progress</span>
              <span className="font-medium text-blue-600">
                {currentQuestionIndex}/{generationState.totalQuestions} questions
              </span>
            </div>
            <Progress 
              value={getProgressPercentage()} 
              className="h-2 bg-blue-100"
            />
          </div>
        )}

        {/* Generation Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-blue-200">
          {generationState.isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <div className="font-medium text-blue-900">Generating AI questions...</div>
                <div className="text-sm text-blue-600">
                  Analyzing your responses to create personalized follow-ups
                </div>
              </div>
            </>
          ) : generationState.error ? (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <div className="font-medium text-red-900">Generation Error</div>
                <div className="text-sm text-red-600">{generationState.error}</div>
              </div>
            </>
          ) : generationState.generatedCount > 0 ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium text-green-900">
                  {generationState.generatedCount} AI questions generated
                </div>
                <div className="text-sm text-green-600">
                  Questions tailored to your previous responses
                </div>
              </div>
            </>
          ) : (
            <>
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <div>
                <div className="font-medium text-amber-900">Ready to generate questions</div>
                <div className="text-sm text-amber-600">
                  AI will create personalized follow-up questions
                </div>
              </div>
            </>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleGenerateQuestion(1)}
            disabled={generationState.isGenerating || !generationState.canGenerate}
            size="sm"
            className="flex items-center gap-2"
          >
            {generationState.isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate 1 Question
          </Button>

          <Button
            onClick={() => handleGenerateQuestion(3)}
            disabled={generationState.isGenerating || !generationState.canGenerate}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Generate 3 Questions
          </Button>

          {generationState.generatedCount > 0 && (
            <Button
              onClick={handleRegenerateQuestions}
              disabled={generationState.isGenerating}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </Button>
          )}
        </div>

        {/* Auto-generate Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-blue-200">
          <div className="text-sm">
            <div className="font-medium text-gray-900">Auto-generate questions</div>
            <div className="text-gray-500">Automatically create questions as you answer</div>
          </div>
          <Button
            type="button"
            variant={autoGenerate ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoGenerate(!autoGenerate)}
          >
            {autoGenerate ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        {/* AI Insights */}
        {previousAnswers.length > 2 && (
          <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-3 border border-purple-200">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-purple-900">AI Insight</div>
                <div className="text-sm text-purple-700">
                  Based on your {previousAnswers.length} responses, the AI has identified 
                  patterns and can generate highly relevant follow-up questions.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generation Limits */}
        {!generationState.canGenerate && (
          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-900">Question Limit Reached</div>
                <div className="text-sm text-amber-700">
                  This survey has reached the maximum number of questions. 
                  Complete your responses to finish the survey.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 