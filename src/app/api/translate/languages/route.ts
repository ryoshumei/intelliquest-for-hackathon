import { NextResponse } from 'next/server';
import { GoogleTranslationService } from '@/infrastructure/external-services/GoogleTranslationService';

/**
 * GET /api/translate/languages
 * Phase 3: Get all supported languages for translation
 */
export async function GET() {
  try {
    // Initialize translation service
    const translationService = new GoogleTranslationService();
    
    // Check service status
    const serviceStatus = translationService.getServiceStatus();
    
    // Get supported languages (will return defaults if service is unavailable)
    const supportedLanguages = await translationService.getSupportedLanguages();

    return NextResponse.json({
      success: true,
      languages: supportedLanguages,
      count: supportedLanguages.length,
      serviceStatus,
      message: serviceStatus.available 
        ? 'Supported languages retrieved from Google Cloud Translation API'
        : 'Translation API not available, using default language list'
    });

  } catch (error) {
    console.error('Error getting supported languages:', error);
    
    // Still try to return default languages
    const translationService = new GoogleTranslationService();
    const defaultLanguages = await translationService.getSupportedLanguages();
    
    return NextResponse.json({
      success: true,
      languages: defaultLanguages,
      count: defaultLanguages.length,
      serviceStatus: { available: false, error: 'Service initialization failed' },
      message: 'Using default language list due to service error',
      warning: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 