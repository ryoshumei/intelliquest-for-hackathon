import { TranslationServiceClient } from '@google-cloud/translate';
import { 
  TranslationService, 
  SupportedLanguage, 
  TranslationResult 
} from '../../application/services/TranslationService';

/**
 * Google Cloud Translation Service Implementation
 * Phase 3: Real-time translation using Vertex AI Translation
 */
export class GoogleTranslationService implements TranslationService {
  private client: TranslationServiceClient | null = null;
  private projectId: string;
  private location: string = 'global';
  private cache: Map<string, { result: string; expires: number }>;
  private isServiceAvailable: boolean = false;
  private initializationError: string | null = null;

  constructor(projectId?: string) {
    this.projectId = projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    this.cache = new Map();
    
    // Initialize client only if project ID is available
    if (this.projectId) {
      try {
        this.client = new TranslationServiceClient();
        this.isServiceAvailable = true;
      } catch (error) {
        console.warn('Google Translation Service initialization failed:', error);
        this.initializationError = error instanceof Error ? error.message : 'Unknown initialization error';
        this.isServiceAvailable = false;
      }
    } else {
      this.initializationError = 'Google Cloud Project ID not configured';
    }
  }

  /**
   * Check if the translation service is available
   */
  isAvailable(): boolean {
    return this.isServiceAvailable && this.client !== null;
  }

  /**
   * Get service status and error information
   */
  getServiceStatus(): { 
    available: boolean; 
    error?: string; 
    projectId?: string; 
  } {
    return {
      available: this.isServiceAvailable,
      error: this.initializationError || undefined,
      projectId: this.projectId || undefined
    };
  }

  /**
   * Translate text from source language to target language
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    try {
      // Check if service is available
      if (!this.isAvailable()) {
        console.warn('Translation service not available, returning original text');
        return text;
      }

      // Check cache first
      const cacheKey = this.getCacheKey(text, targetLanguage, sourceLanguage);
      const cached = this.getCachedTranslation(cacheKey);
      if (cached) {
        return cached;
      }

      // If source and target are the same, return original text
      if (sourceLanguage && sourceLanguage === targetLanguage) {
        return text;
      }

      // Prepare request
      const parent = `projects/${this.projectId}/locations/${this.location}`;
      const request = {
        parent,
        contents: [text],
        mimeType: 'text/plain',
        targetLanguageCode: targetLanguage,
        ...(sourceLanguage && { sourceLanguageCode: sourceLanguage })
      };

      // Make translation request
      const [response] = await this.client!.translateText(request);
      const translatedText = response.translations?.[0]?.translatedText || text;

      // Cache the result (30 days TTL)
      this.cacheTranslation(cacheKey, translatedText, 30 * 24 * 60 * 60 * 1000);

      return translatedText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for specific API permission errors
      if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('SERVICE_DISABLED')) {
        console.warn('Google Cloud Translation API is not enabled or accessible:', errorMessage);
        this.isServiceAvailable = false;
        this.initializationError = 'Translation API not enabled. Please enable it in Google Cloud Console.';
      } else {
        console.error('Translation error:', error);
      }
      
      // Return original text if translation fails
      return text;
    }
  }

  /**
   * Detect the language of the given text
   */
  async detectLanguage(text: string): Promise<string> {
    try {
      // Check if service is available
      if (!this.isAvailable()) {
        console.warn('Translation service not available, defaulting to English');
        return 'en';
      }

      const parent = `projects/${this.projectId}/locations/${this.location}`;
      const request = {
        parent,
        content: text,
        mimeType: 'text/plain'
      };

      const [response] = await this.client!.detectLanguage(request);
      const detectedLanguage = response.languages?.[0]?.languageCode || 'en';

      return detectedLanguage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('SERVICE_DISABLED')) {
        console.warn('Google Cloud Translation API is not enabled for language detection');
        this.isServiceAvailable = false;
      } else {
        console.error('Language detection error:', error);
      }
      
      return 'en'; // Default to English
    }
  }

  /**
   * Translate multiple texts in batch for efficiency
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string[]> {
    try {
      // Check if service is available
      if (!this.isAvailable()) {
        console.warn('Translation service not available, returning original texts');
        return texts;
      }

      // Check cache for each text
      const results: string[] = [];
      const textsToTranslate: { index: number; text: string }[] = [];

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const cacheKey = this.getCacheKey(text, targetLanguage, sourceLanguage);
        const cached = this.getCachedTranslation(cacheKey);
        
        if (cached) {
          results[i] = cached;
        } else {
          textsToTranslate.push({ index: i, text });
        }
      }

      // Translate remaining texts in batch
      if (textsToTranslate.length > 0) {
        const parent = `projects/${this.projectId}/locations/${this.location}`;
        const request = {
          parent,
          contents: textsToTranslate.map(item => item.text),
          mimeType: 'text/plain',
          targetLanguageCode: targetLanguage,
          ...(sourceLanguage && { sourceLanguageCode: sourceLanguage })
        };

        const [response] = await this.client!.translateText(request);
        
        if (response.translations) {
          response.translations.forEach((translation, batchIndex) => {
            const originalIndex = textsToTranslate[batchIndex].index;
            const translatedText = translation.translatedText || texts[originalIndex];
            results[originalIndex] = translatedText;

            // Cache the result
            const text = textsToTranslate[batchIndex].text;
            const cacheKey = this.getCacheKey(text, targetLanguage, sourceLanguage);
            this.cacheTranslation(cacheKey, translatedText, 30 * 24 * 60 * 60 * 1000);
          });
        }
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('SERVICE_DISABLED')) {
        console.warn('Google Cloud Translation API is not enabled for batch translation');
        this.isServiceAvailable = false;
      } else {
        console.error('Batch translation error:', error);
      }
      
      // Return original texts if translation fails
      return texts;
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    try {
      // Always return default languages if service is not available
      if (!this.isAvailable()) {
        console.warn('Translation service not available, using default supported languages');
        return this.getDefaultSupportedLanguages();
      }

      const parent = `projects/${this.projectId}/locations/${this.location}`;
      const request = { parent };

      const [response] = await this.client!.getSupportedLanguages(request);
      
      if (!response.languages) {
        return this.getDefaultSupportedLanguages();
      }

      // Check if the API response contains proper display names
      const apiLanguages = response.languages.map(lang => ({
        code: lang.languageCode || '',
        name: lang.displayName || '',
        nativeName: lang.displayName || '' // Google API doesn't provide native names
      }));

      // If most languages have empty names, fall back to defaults
      const emptyNameCount = apiLanguages.filter(lang => !lang.name || lang.name.trim() === '').length;
      const totalCount = apiLanguages.length;
      
      if (emptyNameCount > totalCount * 0.5) {
        console.warn('Google Translation API returned languages without display names, using default language list');
        return this.getDefaultSupportedLanguages();
      }

      return apiLanguages;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('SERVICE_DISABLED')) {
        console.warn('Google Cloud Translation API is not enabled, using default languages');
        this.isServiceAvailable = false;
        this.initializationError = 'Translation API not enabled. Using default language list.';
      } else {
        console.error('Error fetching supported languages:', error);
      }
      
      return this.getDefaultSupportedLanguages();
    }
  }

  /**
   * Check if translation is needed based on detected vs target language
   */
  async isTranslationNeeded(
    text: string,
    targetLanguage: string
  ): Promise<boolean> {
    try {
      const detectedLanguage = await this.detectLanguage(text);
      return detectedLanguage !== targetLanguage;
    } catch (error) {
      console.error('Error checking translation need:', error);
      return false;
    }
  }

  /**
   * Enhanced translation with metadata
   */
  async translateWithMetadata(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    
    try {
      // Detect source language if not provided
      const actualSourceLanguage = sourceLanguage || await this.detectLanguage(text);
      
      // Check cache
      const cacheKey = this.getCacheKey(text, targetLanguage, actualSourceLanguage);
      const cached = this.getCachedTranslation(cacheKey);
      const isCached = !!cached;
      
      let translatedText: string;
      if (cached) {
        translatedText = cached;
      } else {
        translatedText = await this.translateText(text, targetLanguage, actualSourceLanguage);
      }

      return {
        originalText: text,
        translatedText,
        sourceLanguage: actualSourceLanguage,
        targetLanguage,
        confidence: 0.95, // Google Translate typically has high confidence
        isCached
      };
    } catch (error) {
      console.error('Translation with metadata error:', error);
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceLanguage || 'unknown',
        targetLanguage,
        confidence: 0,
        isCached: false
      };
    }
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // This is a simplified implementation
    // In production, you'd want to track hit/miss ratios
    return {
      size: this.cache.size,
      hitRate: 0.8 // Placeholder
    };
  }

  // Private helper methods

  private getCacheKey(text: string, targetLang: string, sourceLang?: string): string {
    const source = sourceLang || 'auto';
    return `${source}:${targetLang}:${this.hashText(text)}`;
  }

  private hashText(text: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  private getCachedTranslation(cacheKey: string): string | null {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    if (cached) {
      this.cache.delete(cacheKey); // Remove expired entries
    }
    return null;
  }

  private cacheTranslation(cacheKey: string, result: string, ttlMs: number): void {
    this.cache.set(cacheKey, {
      result,
      expires: Date.now() + ttlMs
    });
  }

  private getDefaultSupportedLanguages(): SupportedLanguage[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
      { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'th', name: 'Thai', nativeName: 'ไทย' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' }
    ];
  }
} 