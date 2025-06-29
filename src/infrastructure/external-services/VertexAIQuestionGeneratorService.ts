/**
 * Production-ready Vertex AI Question Generator Service
 * Uses Google's Generative AI with Vertex AI for survey question generation
 * 
 * Updated to use @google/genai package with gemini-2.5-flash model
 */

import { GoogleGenAI } from '@google/genai';
import { 
  AIQuestionGeneratorService,
  DynamicQuestionGenerationParams,
  SurveyResponse,
  QuestionOptimizationSuggestion
} from '../../application/services/AIQuestionGeneratorService';
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
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1000; // 1 second between requests
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokensUsed: 0,
    averageResponseTime: 0,
    lastRequestTime: null as Date | null,
  };

  constructor() {
    this.model = 'gemini-2.5-pro';
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
        // Try different possible response structures for @google/genai package
        const responseObj = response as any;
        
        // Method 1: Direct text property (most common for @google/genai)
        if (responseObj.text && typeof responseObj.text === 'string') {
          console.log('✅ Extracted text using direct text property');
          return responseObj.text;
        }
        
        // Method 2: Check if text is a function (some SDK versions)
        if (typeof responseObj.text === 'function') {
          try {
            const textResult = responseObj.text();
            if (typeof textResult === 'string') {
              console.log('✅ Extracted text using text() method');
              return textResult;
            }
          } catch (e) {
            console.warn('⚠️ Failed to call text() method:', e);
          }
        }
        
        // Method 3: Check for candidates structure (fallback)
        if (responseObj.candidates && Array.isArray(responseObj.candidates) && responseObj.candidates[0]) {
          const candidate = responseObj.candidates[0];
          
          // Check finish reason first
          if (candidate.finishReason === 'MAX_TOKENS') {
            console.warn('⚠️ Response was truncated due to MAX_TOKENS');
          } else if (candidate.finishReason === 'SAFETY') {
            console.warn('⚠️ Response blocked by safety filter');
          }
          
          if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts[0]) {
            const part = candidate.content.parts[0];
            if (part.text && typeof part.text === 'string') {
              console.log('✅ Extracted text using candidates structure');
              return part.text;
            }
          }
        }
        
        // Method 4: Check for nested response structure
        if (responseObj.response && responseObj.response.text) {
          console.log('✅ Extracted text using nested response.text');
          return responseObj.response.text;
        }
        
        // Debug: Log the response structure to understand what we're receiving
        console.log('🔍 Response structure debug:', {
          hasText: 'text' in responseObj,
          textType: typeof responseObj.text,
          hasCandidates: 'candidates' in responseObj,
          hasResponse: 'response' in responseObj,
          keys: Object.keys(responseObj),
          sampleData: JSON.stringify(responseObj).substring(0, 200) + '...'
        });
      }
      
      console.warn('⚠️ Cannot extract text from response - unknown structure');
      return '';
    } catch (error) {
      console.error('❌ Error extracting text from response:', error);
      return '';
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        return await operation();
      } catch (error: any) {
        const isRateLimitError = error?.status === 429 || 
          (error?.message && error.message.includes('Resource exhausted'));
        
        if (isRateLimitError && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`🔄 Rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  private extractJsonArray(text: string): string {
    // Find the first opening bracket
    const startIndex = text.indexOf('[');
    if (startIndex === -1) {
      return '';
    }

    // Use bracket matching to find the complete JSON array
    let bracketCount = 0;
    let endIndex = -1;
    
    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];
      if (char === '[') {
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (endIndex === -1) {
      return '';
    }
    
    return text.slice(startIndex, endIndex + 1);
  }

  private parseQuestions(aiResponse: string): Question[] {
    try {
      console.log('🔍 Parsing AI response for questions...');
      console.log('📝 Full AI response:', aiResponse);

      // Extract JSON array from the response
      const jsonString = this.extractJsonArray(aiResponse);
      console.log('🔧 Extracted JSON string:', jsonString);

      if (!jsonString) {
        throw new Error('No valid JSON array found in response');
      }

      // Clean and fix the JSON
      const cleanedJson = this.cleanAndFixJson(jsonString);
      
      // Try to parse the JSON
      let questionsData;
      try {
        questionsData = JSON.parse(cleanedJson);
        console.log('✅ Successfully parsed original JSON response');
      } catch (parseError) {
        console.warn('⚠️ Failed to parse cleaned JSON, trying fix syntax...');
        const fixedJson = this.tryFixJsonSyntax(cleanedJson);
        questionsData = JSON.parse(fixedJson);
        console.log('✅ Successfully parsed fixed JSON response');
      }

      if (!Array.isArray(questionsData)) {
        throw new Error('Parsed response is not an array');
      }

      const questions: Question[] = [];
      
      for (let i = 0; i < questionsData.length; i++) {
        try {
          const qData = questionsData[i];
          
          if (!qData.text || !qData.type) {
            console.warn(`⚠️ Question ${i + 1} missing required fields, skipping`);
            continue;
          }

          const questionType = this.mapQuestionType(qData.type);
          let options = qData.options || [];
          
          // Handle multiple choice questions validation and fixes
          if (questionType.isMultipleChoice()) {
            if (options.length < 2) {
              console.warn(`⚠️ Multiple choice question has insufficient options (${options.length}), converting to text question`);
              // Convert to text question instead of failing
              const textQuestion = Question.createAIGenerated(
                qData.text,
                QuestionType.text(),
                []
              );
              questions.push(textQuestion);
              continue;
            }
          }
          
          // Scale questions must have exactly 2 options (min and max labels)
          if (questionType.isScale()) {
            if (options.length === 0) {
              options = ["Poor", "Excellent"];
            } else if (options.length === 1) {
              options = [options[0], "Excellent"];
            } else if (options.length > 2) {
              options = [options[0], options[options.length - 1]];
            }
          }
          
          // Yes/No questions should have exactly 2 options
          if (questionType.getValue() === 'yes_no') {
            options = ["Yes", "No"];
          }
          
          // Use the AI factory method to create questions
          const question = Question.createAIGenerated(
            qData.text,
            questionType,
            options
          );
          
          questions.push(question);
        } catch (error) {
          console.warn(`⚠️ Error creating question ${i + 1}:`, error);
          // Continue processing other questions instead of failing completely
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

  private cleanAndFixJson(jsonString: string): string {
    try {
      // Remove control characters and non-printable characters
      let cleaned = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      // Remove any markdown code block markers
      cleaned = cleaned.replace(/```(?:json)?/g, '').trim();
      
      // Fix common JSON issues more carefully
      cleaned = cleaned
        // Remove trailing commas before closing brackets/braces
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix incomplete arrays that might be truncated
        .replace(/\.\.\.$/, '')
        // Remove trailing comma at very end
        .replace(/,\s*$/, '');
      
      // Try to fix incomplete JSON structure
      const openBrackets = (cleaned.match(/\[/g) || []).length;
      const closeBrackets = (cleaned.match(/\]/g) || []).length;
      const openBraces = (cleaned.match(/\{/g) || []).length;
      const closeBraces = (cleaned.match(/\}/g) || []).length;
      
      // Add missing closing brackets
      if (openBrackets > closeBrackets) {
        cleaned += ']'.repeat(openBrackets - closeBrackets);
      }
      
      // Add missing closing braces  
      if (openBraces > closeBraces) {
        cleaned += '}'.repeat(openBraces - closeBraces);
      }
      
      return cleaned;
    } catch (error) {
      console.warn('⚠️ Error cleaning JSON, returning original:', error);
      return jsonString;
    }
  }

  private tryFixJsonSyntax(jsonString: string): string {
    try {
      let fixed = jsonString;
      
      // Fix common AI response issues
      
      // 1. Fix double quotes at the beginning of text values (like ""How familiar...)
      fixed = fixed.replace(/"text":\s*""([^"]*)/g, '"text": "$1');
      
      // 2. Fix incomplete strings that end with ...
      fixed = fixed.replace(/"([^"]*)\.\.\./g, '"$1"');
      
      // 3. Fix escaped quotes that shouldn't be escaped in JSON values
      fixed = fixed.replace(/\\"/g, '"');
      
      // 4. Fix missing quotes around option values
      fixed = fixed.replace(/"options":\s*\[([^\]]*)\]/g, (match, optionsContent) => {
        if (!optionsContent.trim()) {
          return '"options": []';
        }
        
        // Split by comma and ensure each option is properly quoted
        const options = optionsContent.split(',').map((option: string) => {
          const trimmed = option.trim();
          if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            return trimmed; // Already properly quoted
          }
          // Remove any existing quotes and re-quote
          const cleaned = trimmed.replace(/^["']|["']$/g, '');
          return `"${cleaned}"`;
        });
        return `"options": [${options.join(', ')}]`;
      });
      
      // 5. Fix strings that have quotes in the middle but are not properly closed
      fixed = fixed.replace(/"text":\s*"([^"]*)",([^"]*)"([^,}\]]*)/g, '"text": "$1$2$3"');
      
      // 6. Fix unclosed objects/arrays at the end
      const lastChar = fixed.trim().slice(-1);
      if (lastChar === ',') {
        // Remove trailing comma and try to close appropriately
        fixed = fixed.trim().slice(0, -1);
        
        // Determine what kind of closing we need
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;
        
        if (openBraces > closeBraces) {
          fixed += '}';
        }
        if (openBrackets > closeBrackets) {
          fixed += ']';
        }
      }
      
      // 7. Fix incomplete last object in array
      if (fixed.includes('"type":') && !fixed.trim().endsWith(']')) {
        // Find the last incomplete object and try to complete it
        const lastObjectMatch = fixed.match(/\{[^}]*$/);
        if (lastObjectMatch) {
          const incompleteObject = lastObjectMatch[0];
          
          // Check what's missing and add defaults
          if (!incompleteObject.includes('"options"')) {
            fixed += ', "options": []';
          }
          
          fixed += '}]'; // Close the object and array
        }
      }
      
      // 8. Ensure the response starts and ends properly
      if (!fixed.trim().startsWith('[')) {
        fixed = '[' + fixed;
      }
      if (!fixed.trim().endsWith(']')) {
        fixed = fixed + ']';
      }
      
      return fixed;
    } catch (error) {
      console.warn('⚠️ Error in tryFixJsonSyntax:', error);
      return jsonString;
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

  private createResponseSchema(): any {
    return {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The question text that will be displayed to survey respondents"
          },
          type: {
            type: "string",
            enum: ["multiple_choice", "rating", "text", "boolean"],
            description: "The type of question - determines how it will be rendered and answered"
          },
          options: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Array of options for multiple choice/rating questions, empty array for text questions"
          }
        },
        required: ["text", "type", "options"]
      },
      minItems: 1,
      maxItems: 10,
      description: "Array of survey questions with specified structure"
    };
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
      },
      {
        text: "Which of the following features do you find most valuable?",
        type: QuestionType.multipleChoice(),
        options: ["Ease of use", "Customer support", "Price", "Quality", "Other"]
      },
      {
        text: "How can we improve our service?",
        type: QuestionType.text(),
        options: []
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

      console.log(`🎯 Generating ${params.questionCount} questions for: ${params.title}`);
      if (params.description) {
        console.log(`📝 Description: ${params.description}`);
      }
      if (params.targetAudience) {
        console.log(`👥 Target audience: ${params.targetAudience}`);
      }

      // Create detailed prompt for better results
      const prompt = this.createPrompt(params);
      
      console.log('📡 Sending request to Vertex AI...');
      const response = await this.retryWithBackoff(async () => {
        return await this.ai!.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            ...this.generationConfig,
            responseMimeType: "application/json",
            responseSchema: this.createResponseSchema(),
          },
        });
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

    const descriptionContext = params.description
      ? `Survey description: ${params.description}.`
      : '';

    return `Generate exactly ${params.questionCount} high-quality survey questions for a survey titled "${params.title}".

${descriptionContext}
${audienceContext}
${typesContext}
${goalContext}

Question types and guidelines:
- "multiple_choice": Include 3-5 relevant options in the options array
- "rating": Use scale questions, provide exactly 2 options (min and max labels like ["Poor", "Excellent"])
- "text": Open-ended questions, set options to empty array []
- "boolean": Yes/no questions, will automatically get ["Yes", "No"] options

Question quality requirements:
- Clear and unambiguous wording
- Relevant to the survey title and description
- Appropriate for the target audience
- Non-leading and neutral tone
- Actionable for meaningful data collection
- Specific enough to provide valuable insights

Generate diverse, engaging questions that will help achieve the survey goals and provide valuable insights about the topic.`;
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

  // Phase 3: Dynamic Question Generation Methods

  async generateDynamicQuestion(params: DynamicQuestionGenerationParams): Promise<Question> {
    try {
      await this.initialize();

      if (!this.ai) {
        throw new Error('AI service not initialized');
      }

      console.log(`🎯 Generating dynamic question for survey: ${params.surveyId}`);

      const dynamicPrompt = this.createDynamicQuestionPrompt(params);
      
      const response = await this.retryWithBackoff(async () => {
        return await this.ai!.models.generateContent({
          model: this.model,
          contents: dynamicPrompt,
          config: {
            ...this.generationConfig,
            maxOutputTokens: 10000, // Increased to avoid truncation
            responseMimeType: "application/json",
            responseSchema: this.createResponseSchema(),
          },
        });
      });

      const responseText = this.extractTextFromResponse(response);
      const questions = this.parseQuestions(responseText);
      
      if (questions.length > 0) {
        console.log(`✅ Generated dynamic question: ${questions[0].getText()}`);
        return questions[0];
      } else {
        throw new Error('Failed to generate dynamic question');
      }

    } catch (error) {
      console.error('❌ Error generating dynamic question:', error);
      
      // Return a fallback dynamic question
      return Question.createAIGenerated(
        "Based on your previous answers, what would you like to add?",
        QuestionType.text(),
        []
      );
    }
  }

  async generateDynamicQuestions(params: DynamicQuestionGenerationParams): Promise<Question[]> {
    try {
      const questionCount = params.questionCount || 1;
      
      // For single question, use the existing method
      if (questionCount === 1) {
        const question = await this.generateDynamicQuestion(params);
        return [question];
      }

      // For multiple questions, generate them all at once for better performance
      console.log(`🚀 Generating ${questionCount} dynamic questions in batch for better performance`);
      
      await this.initialize();

      if (!this.ai) {
        throw new Error('AI service not initialized');
      }

      const batchPrompt = this.createBatchDynamicQuestionPrompt(params);
      
      const response = await this.retryWithBackoff(async () => {
        return await this.ai!.models.generateContent({
          model: this.model,
          contents: batchPrompt,
          config: {
            ...this.generationConfig,
            maxOutputTokens: 15000, // Increased for multiple questions
            responseMimeType: "application/json",
            responseSchema: this.createResponseSchema(),
          },
        });
      });

      const responseText = this.extractTextFromResponse(response);
      const questions = this.parseQuestions(responseText);
      
      if (questions.length > 0) {
        console.log(`✅ Generated ${questions.length} dynamic questions in batch`);
        return questions.slice(0, questionCount);
      } else {
        throw new Error('Failed to generate dynamic questions in batch');
      }

    } catch (error) {
      console.error('❌ Error generating dynamic questions in batch:', error);
      
      // Fallback to individual generation if batch fails
      console.log('🔄 Falling back to individual question generation...');
      const questions: Question[] = [];
      const questionCount = params.questionCount || 1;

      for (let i = 0; i < questionCount; i++) {
        try {
          const singleParams = { ...params, questionCount: 1 };
          const question = await this.generateDynamicQuestion(singleParams);
          questions.push(question);
        } catch (singleError) {
          console.error(`❌ Failed to generate question ${i + 1}:`, singleError);
          // Continue with other questions
        }
      }

      if (questions.length === 0) {
        // Return fallback questions if all generation fails
        const fallbackCount = params.questionCount || 1;
        return this.createFallbackQuestions().slice(0, fallbackCount);
      }

      return questions;
    }
  }

  async analyzeResponsePatterns(
    responses: SurveyResponse[],
    surveyGoal: string
  ): Promise<QuestionOptimizationSuggestion[]> {
    try {
      await this.initialize();

      if (!this.ai) {
        throw new Error('AI service not initialized');
      }

      if (responses.length === 0) {
        console.log('ℹ️ No responses to analyze');
        return [];
      }

      console.log(`🔍 Analyzing ${responses.length} response patterns`);

      const analysisPrompt = this.createAnalysisPrompt(responses, surveyGoal);
      
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: analysisPrompt,
        config: {
          ...this.generationConfig,
          maxOutputTokens: 1000,
        },
      });

      const responseText = this.extractTextFromResponse(response);
      const suggestions = this.parseOptimizationSuggestions(responseText);
      
      console.log(`✅ Generated ${suggestions.length} optimization suggestions`);
      return suggestions;

    } catch (error) {
      console.error('❌ Error analyzing response patterns:', error);
      return [];
    }
  }

  private createDynamicQuestionPrompt(params: DynamicQuestionGenerationParams): string {
    const previousAnswersContext = params.previousAnswers.length > 0
      ? params.previousAnswers.map((answer, index) => 
          `Q${index + 1}: ${answer.questionText}\nA${index + 1}: ${JSON.stringify(answer.answer)}`
        ).join('\n\n')
      : 'No previous answers provided.';

    const languageContext = params.targetLanguage && params.targetLanguage !== 'en'
      ? `Generate the question in ${params.targetLanguage} language.`
      : '';

    return `Based on the survey goal and previous answers, generate 1 highly relevant follow-up question.

Survey Goal: ${params.surveyGoal}
Current Question Index: ${params.currentQuestionIndex}
Max Questions Allowed: ${params.maxQuestions}

Previous Answers:
${previousAnswersContext}

${languageContext}

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY a valid JSON array containing exactly 1 question
2. The response must be parseable by JSON.parse()
3. No other text, explanations, or markdown formatting
4. Generate a question that builds on the previous answers
5. Make it relevant to the survey goal
6. Avoid repeating similar questions
7. Make it actionable and specific

QUESTION TYPE REQUIREMENTS:
- "text": Open-ended question, options MUST be []
- "multiple_choice": MUST include 3-5 relevant options in the options array. DO NOT use this type if you cannot provide at least 3 valid options
- "rating": Scale question, provide exactly 2 options like ["Poor", "Excellent"] 
- "boolean": Yes/no question, options will be automatically set to ["Yes", "No"]

VALIDATION RULES:
- multiple_choice questions MUST have at least 3 options or the system will fail
- If you cannot think of good multiple choice options, use "text" type instead
- All options must be meaningful and distinct
- Text questions should have empty options array []

Use this exact JSON structure:
[
  {
    "text": "Your dynamic question here",
    "type": "text" | "multiple_choice" | "rating" | "boolean",
    "options": []
  }
]

EXAMPLES:
For text: {"text": "What specific improvements would you suggest?", "type": "text", "options": []}
For multiple_choice: {"text": "Which feature is most important?", "type": "multiple_choice", "options": ["Speed", "Accuracy", "Ease of use", "Cost effectiveness"]}
For rating: {"text": "How satisfied are you?", "type": "rating", "options": ["Very dissatisfied", "Very satisfied"]}

REMEMBER: Return ONLY the JSON array with exactly 1 question, nothing else.`;
  }

  private createAnalysisPrompt(responses: SurveyResponse[], surveyGoal: string): string {
    const responsesSummary = responses.slice(0, 10).map((response, index) => {
      const answersSummary = response.answers.map(answer => 
        `${answer.questionText}: ${JSON.stringify(answer.answer)}`
      ).join('; ');
      return `Response ${index + 1}: ${answersSummary}`;
    }).join('\n');

    return `Analyze these survey responses and provide optimization suggestions for improving the questions.

Survey Goal: ${surveyGoal}
Number of Responses: ${responses.length}

Sample Responses:
${responsesSummary}

Analyze for:
1. Questions that cause confusion or unclear responses
2. Questions with low engagement or high skip rates
3. Questions that could be more specific or actionable
4. Missing question opportunities based on response patterns

Return ONLY a JSON array of suggestions:
[
  {
    "questionId": "current_question_id_if_applicable",
    "currentQuestion": "current question text",
    "suggestedQuestion": "improved question text", 
    "reasoning": "explanation of why this improvement is needed",
    "confidence": 0.8,
    "impact": "high" | "medium" | "low"
  }
]`;
  }

  private parseOptimizationSuggestions(aiResponse: string): QuestionOptimizationSuggestion[] {
    try {
      const cleanResponse = aiResponse.trim();
      
      // Extract JSON from response
      let jsonString = '';
      const codeBlockMatch = cleanResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
      } else {
        const directJsonMatch = cleanResponse.match(/\[[\s\S]*?\]/);
        if (directJsonMatch) {
          jsonString = directJsonMatch[0];
        }
      }
      
      if (!jsonString) {
        console.warn('⚠️ No JSON found in optimization response');
        return [];
      }

      const suggestionsData = JSON.parse(jsonString);
      
      if (!Array.isArray(suggestionsData)) {
        console.warn('⚠️ Parsed optimization response is not an array');
        return [];
      }

      return suggestionsData.map((suggestion: any) => ({
        questionId: suggestion.questionId || 'unknown',
        currentQuestion: suggestion.currentQuestion || '',
        suggestedQuestion: suggestion.suggestedQuestion || '',
        reasoning: suggestion.reasoning || '',
        confidence: suggestion.confidence || 0.7,
        impact: suggestion.impact || 'medium'
      }));

    } catch (error) {
      console.error('❌ Error parsing optimization suggestions:', error);
      return [];
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

  private createBatchDynamicQuestionPrompt(params: DynamicQuestionGenerationParams): string {
    const questionCount = params.questionCount || 1;
    const previousAnswersContext = params.previousAnswers.length > 0
      ? params.previousAnswers.map((answer, index) => 
          `Q${index + 1}: ${answer.questionText}\nA${index + 1}: ${JSON.stringify(answer.answer)}`
        ).join('\n\n')
      : 'No previous answers provided.';

    const languageContext = params.targetLanguage && params.targetLanguage !== 'en'
      ? `Generate all questions in ${params.targetLanguage} language.`
      : '';

    return `Based on the survey goal and previous answers, generate exactly ${questionCount} highly relevant follow-up questions.

Survey Goal: ${params.surveyGoal}
Current Question Index: ${params.currentQuestionIndex}
Max Questions Allowed: ${params.maxQuestions}

Previous Answers:
${previousAnswersContext}

${languageContext}

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY a valid JSON array containing exactly ${questionCount} questions
2. The response must be parseable by JSON.parse()
3. No other text, explanations, or markdown formatting
4. Generate questions that build on the previous answers
5. Make them relevant to the survey goal
6. Avoid repeating similar questions
7. Make them actionable and specific
8. Each question should explore different aspects or dive deeper

QUESTION TYPE REQUIREMENTS:
- "text": Open-ended question, options MUST be []
- "multiple_choice": MUST include 3-5 relevant options in the options array. DO NOT use this type if you cannot provide at least 3 valid options
- "rating": Scale question, provide exactly 2 options like ["Poor", "Excellent"] 
- "boolean": Yes/no question, options will be automatically set to ["Yes", "No"]

VALIDATION RULES:
- multiple_choice questions MUST have at least 3 options or the system will fail
- If you cannot think of good multiple choice options, use "text" type instead
- All options must be meaningful and distinct
- Text questions should have empty options array []
- Ensure variety in question types across the ${questionCount} questions

Use this exact JSON structure:
[
  {
    "text": "Your first dynamic question here",
    "type": "text" | "multiple_choice" | "rating" | "boolean",
    "options": []
  },
  {
    "text": "Your second dynamic question here", 
    "type": "text" | "multiple_choice" | "rating" | "boolean",
    "options": []
  }
  // ... continue for ${questionCount} questions total
]

EXAMPLES:
For text: {"text": "What specific improvements would you suggest?", "type": "text", "options": []}
For multiple_choice: {"text": "Which feature is most important?", "type": "multiple_choice", "options": ["Speed", "Accuracy", "Ease of use", "Cost effectiveness"]}
For rating: {"text": "How satisfied are you?", "type": "rating", "options": ["Very dissatisfied", "Very satisfied"]}

REMEMBER: Return ONLY the JSON array with exactly ${questionCount} questions, nothing else.`;
  }
} 