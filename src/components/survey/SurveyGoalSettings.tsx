'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Target, Globe, Settings } from 'lucide-react';

export interface SurveyGoalConfig {
  goal: string;
  maxQuestions: number;
  targetLanguage: string;
  autoTranslate: boolean;
}

interface Props {
  config: SurveyGoalConfig;
  onChange: (config: SurveyGoalConfig) => void;
  className?: string;
}

interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export function SurveyGoalSettings({ config, onChange, className = '' }: Props) {
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load supported languages
  useEffect(() => {
    loadSupportedLanguages();
  }, []);

  const loadSupportedLanguages = async () => {
    try {
      setLoadingLanguages(true);
      const response = await fetch('/api/translate/languages');
      const data = await response.json();
      
      if (data.success) {
        setSupportedLanguages(data.languages);
      } else {
        console.error('Failed to load languages:', data.error);
        // Fallback to basic languages
        setSupportedLanguages([
          { code: 'en', name: 'English', nativeName: 'English' },
          { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
          { code: 'ja', name: 'Japanese', nativeName: '日本語' },
          { code: 'es', name: 'Spanish', nativeName: 'Español' },
          { code: 'fr', name: 'French', nativeName: 'Français' },
          { code: 'de', name: 'German', nativeName: 'Deutsch' }
        ]);
      }
    } catch (error) {
      console.error('Error loading languages:', error);
      // Use fallback languages
      setSupportedLanguages([
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' }
      ]);
    } finally {
      setLoadingLanguages(false);
    }
  };

  const validateConfig = (newConfig: SurveyGoalConfig): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!newConfig.goal.trim()) {
      newErrors.goal = 'Survey goal is required for dynamic question generation';
    } else if (newConfig.goal.length < 10) {
      newErrors.goal = 'Survey goal should be at least 10 characters long';
    } else if (newConfig.goal.length > 500) {
      newErrors.goal = 'Survey goal should not exceed 500 characters';
    }

    if (newConfig.maxQuestions < 5) {
      newErrors.maxQuestions = 'Minimum 5 questions required';
    } else if (newConfig.maxQuestions > 50) {
      newErrors.maxQuestions = 'Maximum 50 questions allowed';
    }

    return newErrors;
  };

  const updateConfig = (updates: Partial<SurveyGoalConfig>) => {
    const newConfig = { ...config, ...updates };
    const newErrors = validateConfig(newConfig);
    setErrors(newErrors);
    onChange(newConfig);
  };

  const getQuestionRangeLabel = (maxQuestions: number) => {
    if (maxQuestions <= 10) return 'Quick Survey';
    if (maxQuestions <= 20) return 'Standard Survey';
    if (maxQuestions <= 35) return 'Comprehensive Survey';
    return 'Detailed Survey';
  };

  const isValid = Object.keys(errors).length === 0;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Survey Goal & AI Settings
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Survey Goal */}
        <div className="space-y-2">
          <Label htmlFor="survey-goal" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Survey Goal
            <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="survey-goal"
            placeholder="What do you want to learn from this survey? e.g., 'Understand customer satisfaction with our new product features and identify areas for improvement'"
            value={config.goal}
            onChange={(e) => updateConfig({ goal: e.target.value })}
            className={`min-h-[100px] ${errors.goal ? 'border-red-500' : ''}`}
            maxLength={500}
          />
          {errors.goal && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.goal}
            </div>
          )}
          <div className="text-sm text-gray-500">
            {config.goal.length}/500 characters • This helps AI generate relevant follow-up questions
          </div>
        </div>

        {/* Max Questions */}
        <div className="space-y-2">
          <Label htmlFor="max-questions" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Maximum Questions
            <Badge variant="outline">{getQuestionRangeLabel(config.maxQuestions)}</Badge>
          </Label>
          <div className="space-y-3">
            <Input
              id="max-questions"
              type="range"
              min="5"
              max="50"
              step="1"
              value={config.maxQuestions}
              onChange={(e) => updateConfig({ maxQuestions: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">5 questions</span>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {config.maxQuestions}
                </div>
                <div className="text-xs text-gray-500">
                  Base + AI questions
                </div>
              </div>
              <span className="text-sm text-gray-500">50 questions</span>
            </div>
          </div>
          {errors.maxQuestions && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.maxQuestions}
            </div>
          )}
        </div>

        {/* Target Language */}
        <div className="space-y-2">
          <Label htmlFor="target-language" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Target Language
          </Label>
          <Select
            value={config.targetLanguage}
            onValueChange={(value) => updateConfig({ targetLanguage: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select target language" />
            </SelectTrigger>
            <SelectContent>
              {loadingLanguages ? (
                <SelectItem value="loading" disabled>
                  Loading languages...
                </SelectItem>
              ) : (
                supportedLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center gap-2">
                      <span>{lang.name}</span>
                      <span className="text-sm text-gray-500">({lang.nativeName})</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-500">
            Questions will be generated in this language
          </div>
        </div>

        {/* Auto Translate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Auto-translate responses
              </Label>
              <div className="text-sm text-gray-500">
                Automatically translate responses to match target language
              </div>
            </div>
            <Button
              type="button"
              variant={config.autoTranslate ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateConfig({ autoTranslate: !config.autoTranslate })}
            >
              {config.autoTranslate ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>

        {/* AI Features Summary */}
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">AI-Powered Features</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Dynamic questions based on previous answers</li>
                <li>• Context-aware follow-up questions</li>
                <li>• Real-time translation support</li>
                <li>• Intelligent question optimization</li>
              </ul>
              {!isValid && (
                <div className="mt-3 text-sm text-amber-700">
                  Please complete the configuration to enable AI features
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 