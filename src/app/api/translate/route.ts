import { NextRequest, NextResponse } from 'next/server';
import { GoogleTranslationService } from '@/infrastructure/external-services/GoogleTranslationService';

/**
 * POST /api/translate
 * Phase 3: Translate text between languages
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { 
      text, 
      targetLanguage, 
      sourceLanguage, 
      texts, 
      action = 'translate' 
    } = body;

    // Initialize translation service
    const translationService = new GoogleTranslationService();
    const serviceStatus = translationService.getServiceStatus();

    switch (action) {
      case 'translate':
        // Single text translation
        if (!text || !targetLanguage) {
          return NextResponse.json(
            { error: 'Text and target language are required for translation' },
            { status: 400 }
          );
        }

        const translatedText = await translationService.translateText(
          text,
          targetLanguage,
          sourceLanguage
        );

        return NextResponse.json({
          success: true,
          originalText: text,
          translatedText,
          sourceLanguage: sourceLanguage || 'auto-detected',
          targetLanguage,
          serviceStatus,
          translated: translatedText !== text
        });

      case 'batch':
        // Batch translation for multiple texts
        if (!texts || !Array.isArray(texts) || !targetLanguage) {
          return NextResponse.json(
            { error: 'Texts array and target language are required for batch translation' },
            { status: 400 }
          );
        }

        try {
          const translatedTexts = await translationService.translateBatch(
            texts,
            targetLanguage,
            sourceLanguage
          );

          return NextResponse.json({
            success: true,
            translatedTexts,
            originalTexts: texts,
            targetLanguage,
            sourceLanguage: sourceLanguage || 'auto',
            translated: true,
            count: translatedTexts.length
          });
        } catch (error) {
          console.error('Batch translation error:', error);
          return NextResponse.json(
            { error: 'Batch translation failed' },
            { status: 500 }
          );
        }

      case 'detect':
        // Language detection
        if (!text) {
          return NextResponse.json(
            { error: 'Text is required for language detection' },
            { status: 400 }
          );
        }

        const detectedLanguage = await translationService.detectLanguage(text);

        return NextResponse.json({
          success: true,
          text,
          detectedLanguage
        });

      case 'check':
        // Check if translation is needed
        if (!text || !targetLanguage) {
          return NextResponse.json(
            { error: 'Text and target language are required' },
            { status: 400 }
          );
        }

        const isNeeded = await translationService.isTranslationNeeded(
          text,
          targetLanguage
        );

        return NextResponse.json({
          success: true,
          text,
          targetLanguage,
          translationNeeded: isNeeded
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: translate, batch, detect, check' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in translation API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isPermissionError = errorMessage.includes('PERMISSION_DENIED') || 
                             errorMessage.includes('SERVICE_DISABLED');
    
    return NextResponse.json(
      { 
        success: false,
        error: isPermissionError 
          ? 'Translation service not available' 
          : 'Translation service error',
        details: errorMessage,
        serviceAvailable: !isPermissionError,
        suggestion: isPermissionError 
          ? 'Please enable Google Cloud Translation API in your project'
          : 'Please try again later'
      },
      { status: isPermissionError ? 503 : 500 }
    );
  }
}

// GET method moved to /api/translate/languages/route.ts 