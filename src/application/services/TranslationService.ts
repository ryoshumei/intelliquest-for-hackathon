/**
 * Translation Service Interface
 * Phase 3: Multi-language support and real-time translation
 */
export interface TranslationService {
  /**
   * Translate text from source language to target language
   */
  translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string>;

  /**
   * Detect the language of the given text
   */
  detectLanguage(text: string): Promise<string>;

  /**
   * Translate multiple texts in batch for efficiency
   */
  translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string[]>;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Promise<SupportedLanguage[]>;

  /**
   * Check if translation is needed based on detected vs target language
   */
  isTranslationNeeded(
    text: string,
    targetLanguage: string
  ): Promise<boolean>;
}

/**
 * Supported language interface
 */
export interface SupportedLanguage {
  code: string; // ISO 639-1 code
  name: string; // Display name
  nativeName: string; // Native language name
}

/**
 * Translation result with metadata
 */
export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  isCached: boolean;
} 