import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '../../../../application/services/AuthService';

/**
 * POST /api/auth/login - User login endpoint
 * Note: This endpoint is for validating user sessions after client-side Firebase login
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Login API: Starting request');
    
    const body = await request.json();
    console.log('🔐 Login API: Request body parsed');

    // For now, we'll return success to validate the flow
    // TODO: Add Firebase Admin SDK token validation
    
    console.log('🔐 Login API: Login successful (mock)');
    return NextResponse.json({
      success: true,
      message: 'User login completed',
      user: {
        email: body.email,
        displayName: body.displayName || 'User',
        isAnonymous: false
      }
    });

  } catch (error) {
    console.error('🚨 Login API: Error occurred:', error);
    
    return NextResponse.json(
      { error: 'Login failed', code: 'LOGIN_ERROR' },
      { status: 500 }
    );
  }
} 