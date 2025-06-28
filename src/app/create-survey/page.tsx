'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { 
  PlusIcon, 
  SparklesIcon, 
  TrashIcon, 
  EyeIcon, 
  CogIcon,
  ChevronDownIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'multiple_choice' | 'rating' | 'yes_no';
  options?: string[];
  required: boolean;
}

interface Survey {
  title: string;
  description: string;
  questions: Question[];
}

// Helper function to map backend question types to frontend types
function mapBackendTypeToFrontend(backendType: string): Question['type'] {
  switch (backendType.toLowerCase()) {
    case 'text':
    case 'textarea':
      return 'text';
    case 'multiple_choice':
    case 'single_choice':
      return 'multiple_choice';
    case 'scale':
      return 'rating';
    case 'yes_no':
      return 'yes_no';
    default:
      console.warn(`Unknown backend type: ${backendType}, defaulting to text`);
      return 'text';
  }
}

function mapFrontendTypeToBackend(frontendType: Question['type']): string {
  switch (frontendType) {
    case 'text':
      return 'text';
    case 'multiple_choice':
      return 'multiple_choice';
    case 'rating':
      return 'scale';
    case 'yes_no':
      return 'yes_no';
    default:
      console.warn(`Unknown frontend type: ${frontendType}, defaulting to text`);
      return 'text';
  }
}

export default function CreateSurveyPage() {
  const { getToken } = useAuth();
  
  const [survey, setSurvey] = useState<Survey>({
    title: '',
    description: '',
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    text: '',
    type: 'text',
    options: [],
    required: false
  });

  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);

  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const questionTypes = [
    { value: 'text', label: 'Text Response', icon: '📝' },
    { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
    { value: 'rating', label: 'Rating Scale', icon: '⭐' },
    { value: 'yes_no', label: 'Yes/No', icon: '✅' }
  ];

  const addQuestion = () => {
    if (!currentQuestion.text) return;
    
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: currentQuestion.text,
      type: currentQuestion.type as Question['type'],
      options: currentQuestion.options || [],
      required: currentQuestion.required || false
    };

    setSurvey(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    // Reset form
    setCurrentQuestion({
      text: '',
      type: 'text',
      options: [],
      required: false
    });
  };

  const removeQuestion = (id: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const generateAIQuestions = async () => {
    if (!survey.title.trim()) {
      alert('Please enter a survey title first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: survey.title,
          description: survey.description || 'Survey questions',
          useAI: true,
          aiGenerationParams: {
            questionCount: aiQuestionCount,
            targetAudience: 'general',
            questionTypes: ['text', 'multiple_choice', 'rating'].map(type => mapFrontendTypeToBackend(type as Question['type'])),
            surveyGoal: 'Generate questions for survey creation'
          }
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          console.warn('🚨 Authentication failed, redirecting to login');
          window.location.href = '/auth/login';
          return;
        }
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      
      // The API returns survey data directly with questions array
      if (data && data.questions && Array.isArray(data.questions)) {
        // Convert API response to our Question format
        const aiQuestions: Question[] = data.questions.map((q: { id: string; text: string; type: string; options?: string[] }, index: number) => ({
          id: q.id || `ai-${Date.now()}-${index}`,
          text: q.text,
          // Map backend types to frontend types
          type: mapBackendTypeToFrontend(q.type),
          options: q.options || [],
          required: false
        }));

        setSurvey(prev => ({
          ...prev,
          questions: [...prev.questions, ...aiQuestions]
        }));
        
        console.log(`✅ Successfully added ${aiQuestions.length} AI-generated questions`);
      } else {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format');
      }

      setIsAIDialogOpen(false);
      setAiQuestionCount(5);
      
    } catch (error) {
      console.error('Error generating AI questions:', error);
      alert('Failed to generate AI questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSurvey = async () => {
    if (!survey.title.trim()) {
      alert('Please enter a survey title');
      return;
    }

    if (survey.questions.length === 0) {
      alert('Please add at least one question to your survey');
      return;
    }

    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: survey.title,
          description: survey.description,
          useAI: false,
          questions: survey.questions.map(q => ({
            text: q.text,
            type: mapFrontendTypeToBackend(q.type),
            options: q.options || []
          }))
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          console.warn('🚨 Authentication failed, redirecting to login');
          window.location.href = '/auth/login';
          return;
        }
        throw new Error('Failed to save survey');
      }

      const data = await response.json();
      console.log('Survey saved successfully:', data);
      alert('Survey saved successfully!');
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Error saving survey:', error);
      alert(`Failed to save survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const progress = survey.questions.length > 0 ? 
    Math.min((survey.questions.length / 10) * 100, 100) : 0;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Create Survey</h1>
                <p className="text-muted-foreground">Design your survey with AI assistance</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <EyeIcon className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button onClick={saveSurvey} size="sm">
                  <BookmarkIcon className="w-4 h-4 mr-2" />
                  Save Survey
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Survey Progress</span>
                <span>{survey.questions.length} questions</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Survey Settings */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CogIcon className="w-5 h-5" />
                    Survey Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Survey Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter survey title"
                      value={survey.title}
                      onChange={(e) => setSurvey(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your survey purpose"
                      value={survey.description}
                      onChange={(e) => setSurvey(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <Separator />

                  {/* AI Question Generation */}
                  <div>
                    <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" variant="outline">
                          <SparklesIcon className="w-4 h-4 mr-2" />
                          Generate AI Questions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5" />
                            AI Question Generator
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
                            <p><strong>Title:</strong> {survey.title || 'No title set'}</p>
                            <p><strong>Description:</strong> {survey.description || 'No description set'}</p>
                            <p className="mt-2">AI questions will be generated based on your survey title and description.</p>
                          </div>
                          
                          <div>
                            <Label htmlFor="ai-count">Number of Questions</Label>
                            <Select value={aiQuestionCount.toString()} onValueChange={(value) => setAiQuestionCount(Number(value))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="3">3 questions</SelectItem>
                                <SelectItem value="5">5 questions</SelectItem>
                                <SelectItem value="8">8 questions</SelectItem>
                                <SelectItem value="10">10 questions</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button 
                            onClick={generateAIQuestions} 
                            disabled={!survey.title.trim() || isGenerating}
                            className="w-full"
                          >
                            {isGenerating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                Generate Questions
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Question Builder */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="builder" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="builder">Question Builder</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="builder" className="space-y-4">
                  {/* Add Question Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Add New Question
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="question-text">Question Text *</Label>
                        <Textarea
                          id="question-text"
                          placeholder="Enter your question"
                          value={currentQuestion.text}
                          onChange={(e) => setCurrentQuestion(prev => ({ ...prev, text: e.target.value }))}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="question-type">Question Type</Label>
                          <Select 
                            value={currentQuestion.type} 
                            onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, type: value as Question['type'] }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {questionTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <span className="flex items-center gap-2">
                                    <span>{type.icon}</span>
                                    {type.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-end">
                          <Button onClick={addQuestion} disabled={!currentQuestion.text}>
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Add Question
                          </Button>
                        </div>
                      </div>

                      {/* Options for multiple choice */}
                      {currentQuestion.type === 'multiple_choice' && (
                        <div>
                          <Label>Answer Options</Label>
                          <div className="space-y-2">
                            {(currentQuestion.options || []).map((option, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...(currentQuestion.options || [])];
                                    newOptions[index] = e.target.value;
                                    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                                  }}
                                  placeholder={`Option ${index + 1}`}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = (currentQuestion.options || []).filter((_, i) => i !== index);
                                    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                                  }}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newOptions = [...(currentQuestion.options || []), ''];
                                setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                              }}
                            >
                              <PlusIcon className="w-4 h-4 mr-2" />
                              Add Option
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Questions List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Survey Questions ({survey.questions.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {survey.questions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <SparklesIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No questions yet. Add your first question or use AI to generate them.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {survey.questions.map((question, index) => (
                            <div key={question.id} className="border rounded-lg p-4 bg-muted/50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary">
                                      {questionTypes.find(t => t.value === question.type)?.icon}
                                      {questionTypes.find(t => t.value === question.type)?.label}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">Q{index + 1}</span>
                                  </div>
                                  <p className="font-medium">{question.text}</p>
                                  {question.options && question.options.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {question.options.map((option, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {option}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <ChevronDownIcon className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => removeQuestion(question.id)}>
                                      <TrashIcon className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preview">
                  <Card>
                    <CardHeader>
                      <CardTitle>Survey Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-semibold">{survey.title || 'Untitled Survey'}</h2>
                          {survey.description && (
                            <p className="text-muted-foreground mt-2">{survey.description}</p>
                          )}
                        </div>
                        
                        <Separator />
                        
                        {survey.questions.map((question, index) => (
                          <div key={question.id} className="space-y-3">
                            <div className="flex items-start gap-3">
                              <span className="text-sm font-medium text-muted-foreground min-w-[2rem]">
                                {index + 1}.
                              </span>
                              <div className="flex-1">
                                <p className="font-medium">{question.text}</p>
                                
                                {/* Render different question types */}
                                <div className="mt-3">
                                  {question.type === 'text' && (
                                    <Textarea placeholder="Your answer..." disabled className="resize-none" />
                                  )}
                                  
                                  {question.type === 'multiple_choice' && question.options && (
                                    <div className="space-y-2">
                                      {question.options.map((option, i) => (
                                        <div key={i} className="flex items-center space-x-2">
                                          <input type="radio" disabled className="rounded" />
                                          <span>{option}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {question.type === 'rating' && (
                                    <div className="flex items-center space-x-2">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <span key={star} className="text-2xl text-muted-foreground">⭐</span>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {question.type === 'yes_no' && (
                                    <div className="flex items-center space-x-4">
                                      <div className="flex items-center space-x-2">
                                        <input type="radio" disabled />
                                        <span>Yes</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <input type="radio" disabled />
                                        <span>No</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {survey.questions.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <EyeIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Add questions to see the preview</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
} 