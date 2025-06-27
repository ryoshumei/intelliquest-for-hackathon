'use client';

/**
 * Survey Response Page
 * Allows users to answer survey questions
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Progress } from '../../../components/ui/progress';
import { CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: string;
  options: string[];
  isRequired: boolean;
  order: number;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

interface QuestionResponse {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string | string[] | number;
}

export default function SurveyResponsePage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Map<string, QuestionResponse>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load survey data
  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const response = await fetch(`/api/surveys/${surveyId}`);
        const data = await response.json();

        if (data.success) {
          setSurvey(data.survey);
        } else {
          setError('Survey not found');
        }
      } catch (err) {
        setError('Failed to load survey');
      } finally {
        setIsLoading(false);
      }
    };

    if (surveyId) {
      fetchSurvey();
    }
  }, [surveyId]);

  const handleAnswerChange = (questionId: string, answer: string | string[] | number, questionText: string, questionType: string) => {
    const newResponses = new Map(responses);
    newResponses.set(questionId, {
      questionId,
      questionText,
      questionType,
      answer
    });
    setResponses(newResponses);
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Validate required questions
    const unansweredRequired = survey.questions.filter(q => 
      q.isRequired && !responses.has(q.id)
    );

    if (unansweredRequired.length > 0) {
      setError(`Please answer all required questions: ${unansweredRequired.map(q => q.text).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses: Array.from(responses.values()),
          metadata: {
            completedAt: new Date().toISOString(),
            timeSpent: Date.now() // Could track actual time spent
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
      } else {
        setError(data.message || 'Failed to submit response');
      }
    } catch (err) {
      setError('Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionInput = (question: Question) => {
    const currentResponse = responses.get(question.id);
    const currentAnswer = currentResponse?.answer;

    switch (question.type) {
      case 'text':
        return (
          <Textarea
            placeholder="Enter your answer..."
            value={typeof currentAnswer === 'string' ? currentAnswer : ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.text, question.type)}
            className="min-h-[100px]"
          />
        );

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value, question.text, question.type)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'scale':
        const scaleValue = typeof currentAnswer === 'number' ? currentAnswer : 1;
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={scaleValue}
              onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value), question.text, question.type)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center">
              <span className="text-lg font-semibold">{scaleValue}/10</span>
            </div>
          </div>
        );

      case 'yes_no':
        return (
          <div className="space-y-3">
            {['Yes', 'No'].map((option) => (
              <label key={option} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value, question.text, question.type)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <Input
            placeholder="Enter your answer..."
            value={typeof currentAnswer === 'string' ? currentAnswer : ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.text, question.type)}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Survey Not Found</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/')}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Thank You!</h2>
              <p className="text-gray-600 mb-4">
                Your response has been submitted successfully.
              </p>
              <Button onClick={() => router.push('/')}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!survey) return null;

  const progress = ((responses.size) / survey.questions.length) * 100;
  const currentQuestion = survey.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === survey.questions.length - 1;
  const canProceed = !currentQuestion.isRequired || responses.has(currentQuestion.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{survey.title}</h1>
              <p className="text-sm text-gray-600 mt-1">{survey.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {survey.questions.length}
              </p>
              <div className="w-32 mt-1">
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentQuestion.text}
              {currentQuestion.isRequired && (
                <span className="text-red-500 text-sm">*</span>
              )}
            </CardTitle>
            <CardDescription>
              Question {currentQuestionIndex + 1} of {survey.questions.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderQuestionInput(currentQuestion)}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {isLastQuestion ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canProceed}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Survey'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestionIndex(Math.min(survey.questions.length - 1, currentQuestionIndex + 1))}
                  disabled={!canProceed}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 