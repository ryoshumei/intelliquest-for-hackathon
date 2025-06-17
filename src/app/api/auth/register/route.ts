import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '../../../../application/services/AuthService';

/**
 * POST /api/auth/register - User registration endpoint
 * Note: This endpoint is for saving user data after client-side Firebase registration
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Registration API: Starting request');
    
    const body = await request.json();
    console.log('🔐 Registration API: Request body parsed');

    // For now, we'll return success to validate the flow
    // TODO: Add Firebase Admin SDK validation and user data persistence
    
    console.log('🔐 Registration API: Registration successful (mock)');
    return NextResponse.json({
      success: true,
      message: 'User registration completed',
      user: {
        email: body.email,
        displayName: body.displayName,
        isAnonymous: false
      }
    });

  } catch (error) {
    console.error('🚨 Registration API: Error occurred:', error);
    
    return NextResponse.json(
      { error: 'Registration failed', code: 'REGISTRATION_ERROR' },
      { status: 500 }
    );
  }
} 