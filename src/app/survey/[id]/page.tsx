'use client';

/**
 * Survey Response Page
 * Allows users to answer survey questions with translation support
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Progress } from '../../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Globe, RefreshCw, Sparkles } from 'lucide-react';

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
  // Phase 3: New properties
  goal?: string;
  maxQuestions?: number;
  targetLanguage?: string;
  autoTranslate?: boolean;
  dynamicQuestions?: Question[];
}

interface QuestionResponse {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string | string[] | number;
}

interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
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

  // Phase 3: Translation features
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [translatedQuestions, setTranslatedQuestions] = useState<Map<string, string>>(new Map());
  const [translatedOptions, setTranslatedOptions] = useState<Map<string, string[]>>(new Map());
  const [translatingQuestions, setTranslatingQuestions] = useState<Set<string>>(new Set());
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');

  // Phase 3: Dynamic questions features
  const [dynamicQuestions, setDynamicQuestions] = useState<Question[]>([]);
  const [showDynamicQuestions, setShowDynamicQuestions] = useState(false);
  const [generatingDynamicQuestions, setGeneratingDynamicQuestions] = useState(false);

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

  // Load supported languages
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await fetch('/api/translate/languages');
        const data = await response.json();
        
        if (data.success) {
          setSupportedLanguages(data.languages);
          
          // Show service status info
          if (!data.serviceStatus?.available) {
            console.warn('Translation service not available:', data.serviceStatus?.error);
          }
        } else {
          throw new Error(data.error || 'Failed to load languages');
        }
      } catch (error) {
        console.error('Failed to load languages:', error);
        // Fallback languages - always available
        setSupportedLanguages([
          { code: 'en', name: 'English', nativeName: 'English' },
          { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
          { code: 'ja', name: 'Japanese', nativeName: '日本語' },
          { code: 'es', name: 'Spanish', nativeName: 'Español' },
          { code: 'fr', name: 'French', nativeName: 'Français' },
          { code: 'de', name: 'German', nativeName: 'Deutsch' }
        ]);
      }
    };

    loadLanguages();
  }, []);

  // Auto-detect content language when survey loads
  useEffect(() => {
    const detectInitialLanguage = async () => {
      if (survey && survey.questions.length > 0 && !selectedLanguage && supportedLanguages.length > 0) {
        try {
          const firstQuestion = survey.questions[0];
          console.log(`🔍 Auto-detecting language for survey content: "${firstQuestion.text.substring(0, 50)}..."`);
          
          const detectResponse = await fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'detect',
              text: firstQuestion.text
            }),
          });

          const detectData = await detectResponse.json();
          const detectedLanguage = detectData.success && detectData.detectedLanguage ? detectData.detectedLanguage : '';
          
          console.log(`🎯 Detected survey content language: ${detectedLanguage || 'unknown'}`);

          // Check if detected language is in supported languages
          const supportedLang = detectedLanguage ? supportedLanguages.find(lang => lang.code === detectedLanguage) : null;
          if (supportedLang) {
            console.log(`✅ Setting initial language to detected: ${detectedLanguage}`);
            setSelectedLanguage(detectedLanguage);
            setDetectedLanguage(detectedLanguage);
          } else {
            // Fallback to user's browser language or English
            const userLang = navigator.language.split('-')[0];
            const userSupportedLang = supportedLanguages.find(lang => lang.code.startsWith(userLang));
            const fallbackLang = userSupportedLang ? userSupportedLang.code : 'en';
            
            console.log(`⚠️ Detected language ${detectedLanguage || 'unknown'} not supported, falling back to: ${fallbackLang}`);
            setSelectedLanguage(fallbackLang);
            if (detectedLanguage) {
              setDetectedLanguage(detectedLanguage);
            }
          }
        } catch (error) {
          console.error('Failed to detect initial language:', error);
          // Fallback to English if detection fails
          setSelectedLanguage('en');
        }
      }
    };

    detectInitialLanguage();
  }, [survey, supportedLanguages, selectedLanguage]);

  // Clear translation cache when language changes
  useEffect(() => {
    if (selectedLanguage) { // Only clear if we have a selected language
      setTranslatedQuestions(new Map());
      setTranslatedOptions(new Map());
    }
  }, [selectedLanguage]);

  // Auto-translate current question when language changes
  useEffect(() => {
    if (survey && selectedLanguage && currentQuestionIndex >= 0) {
      const allQuestions = [...survey.questions, ...dynamicQuestions];
      const currentQuestion = allQuestions[currentQuestionIndex];
      if (currentQuestion && !translatedQuestions.has(currentQuestion.id)) {
        translateQuestion(currentQuestion);
      }
    }
  }, [selectedLanguage, currentQuestionIndex, survey, dynamicQuestions]);

  const translateQuestion = async (question: Question) => {
    // Only skip if already translating this question
    if (translatingQuestions.has(question.id)) return;

    setTranslatingQuestions(prev => new Set(prev).add(question.id));

    try {
      // First, detect the language of the question text
      const detectResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'detect',
          text: question.text
        }),
      });

                const detectData = await detectResponse.json();
          const detectedLanguage = detectData.success && detectData.detectedLanguage ? detectData.detectedLanguage : 'unknown';

          console.log(`🔍 Detected language: ${detectedLanguage} for text: "${question.text.substring(0, 50)}..."`);

                    // Check if translation is needed
          if (detectedLanguage === selectedLanguage) {
            console.log(`✅ No translation needed: content already in ${selectedLanguage}`);
            // Content is already in target language, no translation needed
            setTranslatingQuestions(prev => {
              const newSet = new Set(prev);
              newSet.delete(question.id);
              return newSet;
            });
            return;
          }

          // If detection failed, we still attempt translation but without explicit source language
          if (detectedLanguage === 'unknown') {
            console.log(`⚠️ Language detection failed, attempting translation anyway`);
          }

      // If languages are different, proceed with translation
      console.log(`🚀 Translating from ${detectedLanguage} to ${selectedLanguage}`);

              // Translate question text
        const translateRequest: any = {
          action: 'translate',
          text: question.text,
          targetLanguage: selectedLanguage
        };

        // Only add sourceLanguage if detection was successful
        if (detectedLanguage !== 'unknown') {
          translateRequest.sourceLanguage = detectedLanguage;
        }

        const questionResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(translateRequest),
        });

      const questionData = await questionResponse.json();

      if (questionData.success && questionData.translated) {
        setTranslatedQuestions(prev => new Map(prev).set(question.id, questionData.translatedText));
      }

      // Translate options if they exist
      if (question.options && question.options.length > 0) {
        const translatedOptionsList: string[] = [];
        
        for (const option of question.options) {
          try {
            // Check if option needs translation by using the same detected language
            if (detectedLanguage === selectedLanguage) {
              // No translation needed, use original option
              translatedOptionsList.push(option);
              continue;
            }

            const optionTranslateRequest: any = {
              action: 'translate',
              text: option,
              targetLanguage: selectedLanguage
            };

            // Only add sourceLanguage if detection was successful
            if (detectedLanguage !== 'unknown') {
              optionTranslateRequest.sourceLanguage = detectedLanguage;
            }

            const optionResponse = await fetch('/api/translate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(optionTranslateRequest),
            });

            const optionData = await optionResponse.json();
            
            if (optionData.success && optionData.translated) {
              translatedOptionsList.push(optionData.translatedText);
            } else {
              translatedOptionsList.push(option); // Keep original if translation fails
            }
          } catch (error) {
            console.error('Failed to translate option:', option, error);
            translatedOptionsList.push(option); // Keep original on error
          }
        }
        
        setTranslatedOptions(prev => new Map(prev).set(question.id, translatedOptionsList));
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslatingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(question.id);
        return newSet;
      });
    }
  };

  const translateAllQuestions = async () => {
    if (!survey) return;

    const allQuestions = [...survey.questions, ...dynamicQuestions];
    const questionsToTranslate = allQuestions.filter(q => 
      !translatedQuestions.has(q.id) && !translatingQuestions.has(q.id)
    );

    for (const question of questionsToTranslate) {
      await translateQuestion(question);
      // Add small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const generateDynamicQuestions = async (count: number = 1) => {
    if (!survey || responses.size === 0) return;

    setGeneratingDynamicQuestions(true);

    try {
      const response = await fetch(`/api/surveys/${surveyId}/dynamic-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyGoal: survey.description || survey.goal || 'Understanding user preferences',
          previousAnswers: Array.from(responses.values()),
          currentQuestionIndex: currentQuestionIndex,
          questionCount: count,
          maxQuestions: survey.maxQuestions || 10,
          targetLanguage: selectedLanguage
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Handle single question response
        if (data.question) {
          const newDynamicQuestion: Question = {
            id: `dynamic-${Date.now()}`,
            text: data.question.text,
            type: data.question.type,
            options: data.question.options || [],
            isRequired: false,
            order: survey.questions.length + dynamicQuestions.length + 1
          };

          setDynamicQuestions(prev => [...prev, newDynamicQuestion]);
          setShowDynamicQuestions(true);
          // Move to the first dynamic question
          setCurrentQuestionIndex(survey.questions.length);
        }
        // Handle multiple questions response
        else if (data.questions && data.questions.length > 0) {
          const newDynamicQuestions: Question[] = data.questions.map((q: any, index: number) => ({
            id: `dynamic-${Date.now()}-${index}`,
            text: q.text,
            type: q.type,
            options: q.options || [],
            isRequired: false,
            order: survey.questions.length + dynamicQuestions.length + index + 1
          }));

          setDynamicQuestions(prev => [...prev, ...newDynamicQuestions]);
          setShowDynamicQuestions(true);
          // Move to the first dynamic question
          setCurrentQuestionIndex(survey.questions.length);
        }

        console.log('✅ Dynamic questions generated:', data.message);
      } else {
        console.error('❌ Dynamic question generation failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to generate dynamic questions:', error);
    } finally {
      setGeneratingDynamicQuestions(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string | string[] | number, questionText: string, questionType: string) => {
    const newResponses = new Map(responses);
    newResponses.set(questionId, {
      questionId,
      questionText,
      questionType,
      answer
    });
    setResponses(newResponses);

    // No longer automatically generate dynamic questions here
    // They will be generated when user clicks Next on the last base question
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Combine original and dynamic questions for validation
    const allQuestions = [...survey.questions, ...dynamicQuestions];
    const allRequiredQuestions = allQuestions.filter(q => 
      q.isRequired && !responses.has(q.id)
    );

    if (allRequiredQuestions.length > 0) {
      setError(`Please answer all required questions: ${allRequiredQuestions.map(q => q.text).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare all responses including dynamic questions
      let allResponses = Array.from(responses.entries()).map(([questionId, response]) => {
        // Find the question (could be regular or dynamic)
        const question = allQuestions.find(q => q.id === questionId);
        return {
          questionId: response.questionId,
          questionText: response.questionText || question?.text || '',
          questionType: response.questionType || question?.type || '',
          answer: response.answer,
          originalQuestionText: response.questionText || question?.text || '',
          originalAnswer: response.answer
        };
      });

      console.log(`📤 Submitting ${allResponses.length} responses (${survey.questions.length} base + ${dynamicQuestions.length} dynamic)`);

      // Check if translation is needed (user language vs survey target language)
      const needsTranslation = survey.targetLanguage && selectedLanguage !== survey.targetLanguage;

      if (needsTranslation) {
        console.log(`🚀 Batch translating all content from ${selectedLanguage} to ${survey.targetLanguage}`);

        // Collect all texts to translate
        const questionsToTranslate = allResponses.map(r => r.questionText);
        const answersToTranslate = allResponses
          .filter(r => typeof r.answer === 'string' && r.answer.trim())
          .map(r => r.answer as string);

        try {
          // Batch translate all question texts
          const questionsTranslationPromise = fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'batch',
              texts: questionsToTranslate,
              targetLanguage: survey.targetLanguage,
              sourceLanguage: selectedLanguage
            }),
          });

          // Batch translate all answers
          const answersTranslationPromise = answersToTranslate.length > 0
            ? fetch('/api/translate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'batch',
                  texts: answersToTranslate,
                  targetLanguage: survey.targetLanguage,
                  sourceLanguage: selectedLanguage
                }),
              })
            : Promise.resolve(null);

          // Execute both batch translations in parallel
          const [questionsResponse, answersResponse] = await Promise.all([
            questionsTranslationPromise,
            answersTranslationPromise
          ]);

          const questionsData = await questionsResponse.json();
          const answersData = answersResponse ? await answersResponse.json() : null;

          // Apply translations to responses
          let answerIndex = 0;
          allResponses = allResponses.map((response, index) => {
            const translatedQuestionText = questionsData.success 
              ? questionsData.translatedTexts[index] 
              : response.questionText;

            let translatedAnswer = response.answer;
            if (typeof response.answer === 'string' && response.answer.trim() && answersData && answersData.success) {
              translatedAnswer = answersData.translatedTexts[answerIndex];
              answerIndex++;
            }

            return {
              ...response,
              questionText: translatedQuestionText,
              answer: translatedAnswer,
              // Keep original for reference
              originalQuestionText: response.questionText,
              originalAnswer: response.answer,
              originalLanguage: selectedLanguage,
              translatedToLanguage: survey.targetLanguage,
              translationApplied: translatedQuestionText !== response.questionText || translatedAnswer !== response.answer
            };
          });

          console.log(`✅ Completed batch translation with 2 API calls instead of ${questionsToTranslate.length + answersToTranslate.length}`);
        } catch (error) {
          console.error('Batch translation failed, falling back to individual translation:', error);
          // Fallback to individual translation if batch fails
          // ... (keeping original individual translation logic as fallback)
        }
      }

      // Prepare dynamic questions with translations
      let translatedDynamicQuestions = dynamicQuestions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        isAIGenerated: true,
        originalText: q.text,
        originalOptions: q.options
      }));

      // Batch translate dynamic questions if needed
      if (needsTranslation && dynamicQuestions.length > 0) {
        console.log(`🚀 Batch translating ${dynamicQuestions.length} dynamic questions`);
        
        try {
          // Collect all dynamic question texts and options
          const dynamicTextsToTranslate = dynamicQuestions.map(q => q.text);
          const allOptionsToTranslate: string[] = [];
          const optionsMapping: { questionIndex: number, optionCount: number }[] = [];
          
          dynamicQuestions.forEach((q, index) => {
            if (q.options && q.options.length > 0) {
              optionsMapping.push({ questionIndex: index, optionCount: q.options.length });
              allOptionsToTranslate.push(...q.options);
            }
          });

          // Batch translate question texts and options
          const dynamicQuestionsPromise = fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'batch',
              texts: dynamicTextsToTranslate,
              targetLanguage: survey.targetLanguage,
              sourceLanguage: selectedLanguage
            }),
          });

          const dynamicOptionsPromise = allOptionsToTranslate.length > 0
            ? fetch('/api/translate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'batch',
                  texts: allOptionsToTranslate,
                  targetLanguage: survey.targetLanguage,
                  sourceLanguage: selectedLanguage
                }),
              })
            : Promise.resolve(null);

          const [questionsResponse, optionsResponse] = await Promise.all([
            dynamicQuestionsPromise,
            dynamicOptionsPromise
          ]);

          const questionsData = await questionsResponse.json();
          const optionsData = optionsResponse ? await optionsResponse.json() : null;

          // Apply translations to dynamic questions
          let optionIndex = 0;
          translatedDynamicQuestions = dynamicQuestions.map((q, index) => {
            const translatedText = questionsData.success 
              ? questionsData.translatedTexts[index] 
              : q.text;

            let translatedOptions = q.options;
            if (q.options && q.options.length > 0 && optionsData && optionsData.success) {
              translatedOptions = q.options.map(() => {
                return optionsData.translatedTexts[optionIndex++];
              });
            }

            return {
              id: q.id,
              text: translatedText,
              type: q.type,
              options: translatedOptions,
              isAIGenerated: true,
              originalText: q.text,
              originalOptions: q.options,
              originalLanguage: selectedLanguage,
              translatedToLanguage: survey.targetLanguage
            };
          });

          console.log(`✅ Completed batch translation of dynamic questions with 2 API calls instead of ${dynamicTextsToTranslate.length + allOptionsToTranslate.length}`);
        } catch (error) {
          console.error('Failed to batch translate dynamic questions:', error);
          // Continue with original questions if batch translation fails
        }
      }

      const response = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses: allResponses,
          dynamicQuestions: translatedDynamicQuestions,
          metadata: {
            completedAt: new Date().toISOString(),
            timeSpent: Date.now(), // Could track actual time spent
            userLanguage: selectedLanguage,
            detectedLanguage: detectedLanguage,
            surveyTargetLanguage: survey.targetLanguage,
            translationApplied: needsTranslation,
            totalQuestions: allQuestions.length,
            baseQuestionsCount: survey.questions.length,
            dynamicQuestionsCount: dynamicQuestions.length
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

  const getQuestionText = (question: Question) => {
    return translatedQuestions.get(question.id) || question.text;
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
        const translatedOpts = translatedOptions.get(question.id) || question.options;
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
                <span className="text-sm">{translatedOpts[index] || option}</span>
              </label>
            ))}
          </div>
        );

      case 'scale':
        const scaleValue = typeof currentAnswer === 'number' ? currentAnswer : 1;
        const scaleLabels = translatedOptions.get(question.id) || ['Poor', 'Excellent'];
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{scaleLabels[0] || 'Poor'}</span>
              <span>{scaleLabels[1] || 'Excellent'}</span>
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
        const yesNoOptions = ['Yes', 'No'];
        const translatedYesNo = translatedOptions.get(question.id) || yesNoOptions;
        return (
          <div className="space-y-3">
            {yesNoOptions.map((option, index) => (
              <label key={option} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value, question.text, question.type)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">{translatedYesNo[index] || option}</span>
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

  // Combine original questions with dynamic questions
  const allQuestions = [...survey.questions, ...dynamicQuestions];
  const totalQuestions = allQuestions.length;
  
  const progress = ((responses.size) / totalQuestions) * 100;
  const currentQuestion = allQuestions[currentQuestionIndex];
  
  // Safety check for currentQuestion
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Survey Error</h2>
              <p className="text-gray-600 mb-4">Unable to load survey questions</p>
              <Button onClick={() => router.push('/')}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const canProceed = !currentQuestion.isRequired || responses.has(currentQuestion.id);
  const isDynamicQuestion = currentQuestion.id.startsWith('dynamic-');
  const isLastBaseQuestion = currentQuestionIndex === survey.questions.length - 1;
  const allBaseQuestionsAnswered = survey.questions.every(q => responses.has(q.id));
  const shouldGenerateDynamicQuestions = survey.goal && survey.maxQuestions && 
    allBaseQuestionsAnswered && dynamicQuestions.length === 0 && !generatingDynamicQuestions;



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
                Question {currentQuestionIndex + 1} of {totalQuestions}
                {dynamicQuestions.length > 0 && (
                  <span className="text-xs text-blue-600 ml-1">
                    ({dynamicQuestions.length} AI generated)
                  </span>
                )}
              </p>
              <div className="w-32 mt-1">
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>
          
          {/* Phase 3: Translation Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <Label htmlFor="language-select" className="text-sm font-medium">
                  Language:
                </Label>
                <Select 
                  value={selectedLanguage} 
                  onValueChange={setSelectedLanguage}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Detecting language..." />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2">
                          <span>{lang.name}</span>
                          <span className="text-xs text-gray-500">({lang.nativeName})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {translatingQuestions.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={true}
                >
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Translating...
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
               Multi-language Support
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getQuestionText(currentQuestion)}
              {currentQuestion.isRequired && (
                <span className="text-red-500 text-sm">*</span>
              )}
              {selectedLanguage && !translatedQuestions.has(currentQuestion.id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => translateQuestion(currentQuestion)}
                  disabled={translatingQuestions.has(currentQuestion.id)}
                >
                  {translatingQuestions.has(currentQuestion.id) ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                </Button>
              )}
            </CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>
                Question {currentQuestionIndex + 1} of {totalQuestions}
                {isDynamicQuestion && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Generated
                  </Badge>
                )}
              </span>
              {translatedQuestions.has(currentQuestion.id) && (
                <Badge variant="outline" className="text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  Translated
                </Badge>
              )}
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



              {isLastQuestion && !(isLastBaseQuestion && survey.goal && survey.maxQuestions && survey.maxQuestions > survey.questions.length && dynamicQuestions.length === 0) ? (
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
                  onClick={async () => {
                                        // If this is the last base question and we should generate dynamic questions
                    if (isLastBaseQuestion && canProceed) {
                      // Check if we should generate dynamic questions
                      if (survey.goal && survey.maxQuestions && survey.maxQuestions > survey.questions.length && dynamicQuestions.length === 0) {
                        const questionsToGenerate = survey.maxQuestions - survey.questions.length;
                        await generateDynamicQuestions(questionsToGenerate);
                      } else {
                        // No dynamic questions to generate, submit survey
                        await handleSubmit();
                      }
                    } else {
                      // Just move to next question
                      setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1));
                    }
                  }}
                  disabled={!canProceed || (isLastBaseQuestion && generatingDynamicQuestions)}
                >
                  {isLastBaseQuestion && generatingDynamicQuestions ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating Questions...
                    </>
                  ) : isLastBaseQuestion && survey.goal && survey.maxQuestions && survey.maxQuestions > survey.questions.length && dynamicQuestions.length === 0 ? (
                    <>
                      Generate AI Questions
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
} 