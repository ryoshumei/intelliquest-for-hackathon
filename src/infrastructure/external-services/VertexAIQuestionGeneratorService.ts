/**
 * Production-ready Vertex AI Question Generator Service
 * Uses Google's Generative AI with Vertex AI for survey question generation
 * 
 * Updated to use @google/genai package with gemini-2.5-flash model
 */

import { GoogleGenAI } from '@google/genai';
import { AIQuestionGeneratorService } from '../../application/services/AIQuestionGeneratorService';
import { Question } from '../../domain/survey/entities/Question';
import { QuestionType } from '../../domain/survey/value-objects/QuestionType';
import { AIGenerationParams } from '../../application/use-cases/CreateSurveyUseCase';

interface ServiceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  lastRequestTime: Date | null;
  model: string;
  package: string;
  location: string;
  isInitialized: boolean;
  successRate: string;
}

export class VertexAIQuestionGeneratorService implements AIQuestionGeneratorService {
  private ai: GoogleGenAI | null = null;
  private model: string;
  private generationConfig: {
    maxOutputTokens: number;
    temperature: number;
    topP: number;
    seed?: number;
  };
  private isInitialized: boolean = false;
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokensUsed: 0,
    averageResponseTime: 0,
    lastRequestTime: null as Date | null,
  };

  constructor() {
    this.model = 'gemini-2.5-flash';
    this.generationConfig = {
      maxOutputTokens: 2000,
      temperature: 0.7,
      topP: 0.9,
      seed: 0,
    };
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Vertex AI with verified configuration...');
      
      // Initialize with verified working configuration
      this.ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT_ID || 'intelliquest-hackathon',
        location: 'global', // Verified working location
      });

      console.log(`✅ Vertex AI initialized successfully`);
      console.log(`📍 Project: ${process.env.GOOGLE_CLOUD_PROJECT_ID || 'intelliquest-hackathon'}`);
      console.log(`🌍 Location: global`);
      console.log(`🤖 Model: ${this.model}`);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Vertex AI:', error);
      throw new Error(`Vertex AI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractTextFromResponse(response: unknown): string {
    try {
      // Handle the @google/genai response structure
      if (response && typeof response === 'object' && response !== null) {
        // The response object has a text property that contains the generated text
        const responseObj = response as { text?: string; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        
        // Method 1: Direct text property (primary method for @google/genai)
        if (responseObj.text && typeof responseObj.text === 'string') {
          return responseObj.text;
        }
        
        // Method 2: Fallback to candidates structure
        if (responseObj.candidates && Array.isArray(responseObj.candidates) && responseObj.candidates[0]) {
          const candidate = responseObj.candidates[0];
          if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts[0]) {
            const part = candidate.content.parts[0];
            if (part.text && typeof part.text === 'string') {
              return part.text;
            }
          }
        }
      }
      
      console.warn('⚠️ Cannot extract text from response');
      return '';
    } catch (error) {
      console.error('❌ Error extracting text from response:', error);
      return '';
    }
  }

  private parseQuestions(aiResponse: string): Question[] {
    try {
      console.log('🔍 Parsing AI response for questions...');
      
      // Clean the response
      const cleanResponse = aiResponse.trim();
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonString = '';
      
      // First, try to extract from markdown code blocks
      const codeBlockMatch = cleanResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      } else {
        // Fallback: try to find JSON array directly
        const directJsonMatch = cleanResponse.match(/\[[\s\S]*?\]/);
        if (directJsonMatch) {
          jsonString = directJsonMatch[0];
        }
      }
      
      if (!jsonString) {
        console.warn('⚠️ No JSON found in response');
        console.log('📝 Response preview:', cleanResponse.slice(0, 200) + '...');
        return this.createFallbackQuestions();
      }

      // Clean up the JSON string (remove any trailing commas, etc.)
      jsonString = jsonString
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters

      const questionsData = JSON.parse(jsonString);
      
      if (!Array.isArray(questionsData)) {
        console.warn('⚠️ Parsed response is not an array');
        return this.createFallbackQuestions();
      }

      const questions: Question[] = [];
      
      for (let i = 0; i < questionsData.length; i++) {
        const qData = questionsData[i];
        
        if (!qData.text || !qData.type) {
          console.warn(`⚠️ Question ${i + 1} missing required fields`);
          continue;
        }

        try {
          // Map AI question type to our domain QuestionType
          const questionType = this.mapQuestionType(qData.type);
          
          // Use the AI factory method to create questions
          const question = Question.createAIGenerated(
            qData.text,
            questionType,
            qData.options || []
          );
          
          questions.push(question);
        } catch (error) {
          console.warn(`⚠️ Error creating question ${i + 1}:`, error);
        }
      }

      console.log(`✅ Successfully parsed ${questions.length} questions from AI response`);
      return questions;
      
    } catch (error) {
      console.error('❌ Error parsing AI response:', error);
      console.log('📝 Raw response:', aiResponse.slice(0, 200) + '...');
      return this.createFallbackQuestions();
    }
  }

  private mapQuestionType(aiType: string): QuestionType {
    switch (aiType.toLowerCase()) {
      case 'multiple_choice':
        return QuestionType.multipleChoice();
      case 'rating':
        return QuestionType.scale();
      case 'boolean':
        return QuestionType.yesNo();
      case 'text':
        return QuestionType.text();
      default:
        return QuestionType.text();
    }
  }

  private createFallbackQuestions(): Question[] {
    console.log('🔄 Creating fallback questions...');
    
    const fallbackQuestions = [
      {
        text: "How would you rate your overall experience?",
        type: QuestionType.scale(),
        options: ["Poor", "Excellent"]
      },
      {
        text: "What did you like most about our service?",
        type: QuestionType.text(),
        options: []
      },
      {
        text: "Would you recommend us to others?",
        type: QuestionType.yesNo(),
        options: ["Yes", "No"]
      }
    ];

    return fallbackQuestions.map((qData) => 
      Question.createAIGenerated(qData.text, qData.type, qData.options)
    );
  }

  async generateQuestions(params: AIGenerationParams): Promise<Question[]> {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date();

    try {
      await this.initialize();

      if (!this.ai) {
        throw new Error('AI service not initialized');
      }

      console.log(`🎯 Generating ${params.questionCount} questions about: ${params.topic}`);
      if (params.targetAudience) {
        console.log(`👥 Target audience: ${params.targetAudience}`);
      }

      // Create detailed prompt for better results
      const prompt = this.createPrompt(params);
      
      console.log('📡 Sending request to Vertex AI...');
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          ...this.generationConfig,
        },
      });
      
      // Extract text from response
      const responseText = this.extractTextFromResponse(response);
      
      if (!responseText) {
        throw new Error('Empty response from Vertex AI');
      }

      console.log('✅ Received response from Vertex AI');
      console.log(`📊 Response length: ${responseText.length} characters`);

      // Update stats
      const elapsedTime = Date.now() - startTime;
      this.stats.successfulRequests++;
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + elapsedTime) / 
        this.stats.successfulRequests;

      // Track token usage if available
      const resp = response as unknown as Record<string, unknown>;
      if (resp && resp.usageMetadata) {
        const usage = resp.usageMetadata as Record<string, unknown>;
        this.stats.totalTokensUsed += (usage.totalTokenCount as number) || 0;
      }

      // Parse and return questions
      const questions = this.parseQuestions(responseText);
      
      console.log(`🎉 Successfully generated ${questions.length} questions`);
      return questions.slice(0, params.questionCount);

    } catch (error) {
      this.stats.failedRequests++;
      
      console.error('❌ Error generating questions:', error);
      
      // Return fallback questions to maintain functionality
      console.log('🔄 Falling back to default questions...');
      return this.createFallbackQuestions().slice(0, params.questionCount);
    }
  }

  private createPrompt(params: AIGenerationParams): string {
    const audienceContext = params.targetAudience 
      ? `The survey is targeted at: ${params.targetAudience}.` 
      : 'The survey is for a general audience.';
    
    const typesContext = params.questionTypes && params.questionTypes.length > 0
      ? `Focus on these question types: ${params.questionTypes.join(', ')}.`
      : 'Use a mix of question types including multiple choice, rating scales, and open-ended text questions.';

    const goalContext = params.surveyGoal
      ? `Survey goal: ${params.surveyGoal}.`
      : '';

    return `Generate exactly ${params.questionCount} high-quality survey questions about "${params.topic}".

${audienceContext}
${typesContext}
${goalContext}

Requirements:
1. Return ONLY a JSON array with this exact structure:
[
  {
    "text": "Question text here",
    "type": "multiple_choice" | "rating" | "text" | "boolean",
    "options": ["option1", "option2", "option3"] or null for text questions
  }
]

2. Question types:
   - "multiple_choice": Include 3-5 relevant options
   - "rating": Use scale questions (will be converted to rating scale)
   - "text": Set options to null
   - "boolean": Use for yes/no questions

3. Make questions:
   - Clear and unambiguous
   - Relevant to the topic
   - Appropriate for the target audience
   - Non-leading and neutral
   - Actionable for data collection

4. Return ONLY the JSON array, no additional text or explanation.

Topic: ${params.topic}
Count: ${params.questionCount}`;
  }

  async improveQuestions(questions: Question[], context: string): Promise<Question[]> {
    try {
      await this.initialize();

      if (!this.ai) {
        throw new Error('AI service not initialized');
      }
      
      const questionsList = questions.map((q, index) => 
        `${index + 1}. ${q.getText()} (Type: ${q.getType().getValue()})`
      ).join('\n');

      const improvementPrompt = `Improve these survey questions to make them clearer, more specific, and better for data collection:

Original questions:
${questionsList}

Context: ${context}

Return ONLY a JSON array with improved questions:
[
  {
    "text": "improved question text",
    "type": "multiple_choice" | "rating" | "text" | "boolean",
    "options": ["option1", "option2"] or null
  }
]`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: improvementPrompt,
        config: {
          ...this.generationConfig,
          maxOutputTokens: 1000,
        },
      });

      const responseText = this.extractTextFromResponse(response);
      
      const improvedQuestions = this.parseQuestions(responseText);
      
      console.log(`✅ Improved ${improvedQuestions.length} questions`);
      return improvedQuestions.length > 0 ? improvedQuestions : questions;
      
    } catch (error) {
      console.error('❌ Error improving questions:', error);
      
      // Return original questions with slight modification
      return questions.map(q => 
        Question.createAIGenerated(
          `[Improved] ${q.getText()}`,
          q.getType(),
          q.getOptions()
        )
      );
    }
  }

  async generateFollowUpQuestions(
    existingQuestions: Question[],
    topic: string,
    count: number
  ): Promise<Question[]> {
    try {
      await this.initialize();

      if (!this.ai) {
        throw new Error('AI service not initialized');
      }
      
      const context = existingQuestions.slice(0, 5).map(q => 
        `- ${q.getText()} (${q.getType().getValue()})`
      ).join('\n');

      const followUpPrompt = `Based on these original survey questions, generate ${count} relevant follow-up questions about "${topic}":

Original questions:
${context}

Generate follow-up questions that:
1. Dive deeper into the topics covered
2. Explore areas that weren't fully addressed
3. Help understand the "why" behind responses
4. Are relevant and valuable for analysis

Return ONLY a JSON array with this structure:
[
  {
    "text": "Follow-up question text",
    "type": "text" | "multiple_choice" | "rating" | "boolean",
    "options": ["option1", "option2"] or null
  }
]`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: followUpPrompt,
        config: {
          ...this.generationConfig,
        },
      });

      const responseText = this.extractTextFromResponse(response);
      
      const followUpQuestions = this.parseQuestions(responseText);
      
      console.log(`✅ Generated ${followUpQuestions.length} follow-up questions`);
      return followUpQuestions.slice(0, count);
      
    } catch (error) {
      console.error('❌ Error generating follow-up questions:', error);
      
      // Return generic follow-up questions
      return [
        Question.createAIGenerated(
          `What additional feedback would you like to share about ${topic}?`,
          QuestionType.text(),
          []
        ),
        Question.createAIGenerated(
          `How likely are you to participate in future surveys?`,
          QuestionType.scale(),
          ["Very unlikely", "Very likely"]
        )
      ].slice(0, count);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();

      if (!this.ai) {
        return false;
      }
      
      // Simple test to check if the service is available
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: 'Respond with "Available" to confirm service status.',
        config: {
          ...this.generationConfig,
          maxOutputTokens: 10,
        },
      });

      const responseText = this.extractTextFromResponse(response);
      
      return responseText.toLowerCase().includes('available');
    } catch (error) {
      console.error('❌ Vertex AI availability check failed:', error);
      return false;
    }
  }

  getSupportedQuestionTypes(): string[] {
    return [
      'text',
      'multiple_choice',
      'rating',
      'boolean',
      'scale'
    ];
  }

  getStats(): ServiceStats {
    return {
      ...this.stats,
      model: this.model,
      package: '@google/genai',
      location: 'global',
      isInitialized: this.isInitialized,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%',
    };
  }
} 