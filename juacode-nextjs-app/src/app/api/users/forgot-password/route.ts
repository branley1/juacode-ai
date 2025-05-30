import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Define response timeout - next.js route config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Helper to add CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: corsHeaders(),
    status: 200
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { 
        status: 400,
        headers: corsHeaders()
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Please enter a valid email address' 
      }, { 
        status: 400,
        headers: corsHeaders()
      });
    }

    // Determine origin dynamically for redirect link
    const { origin } = new URL(req.url);
    const resetUrl = `${origin}/reset-password`;
    // Send password reset email using Supabase
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });

    if (error) {
      console.error('Supabase password reset error:', error);
      
      // Don't reveal whether the email exists or not for security
      // Return success message regardless
      return NextResponse.json({
        message: 'If an account with that email exists, we\'ve sent you a password reset link.',
        success: true
      }, { 
        status: 200,
        headers: corsHeaders()
      });
    }

    return NextResponse.json({
      message: 'If an account with that email exists, we\'ve sent you a password reset link.',
      success: true
    }, { 
      status: 200,
      headers: corsHeaders()
    });

  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    const message = 'Failed to process password reset request.';
    let detail = '';
    if (error instanceof Error) detail = error.message;
    
    return NextResponse.json({ 
      error: message, 
      detail 
    }, { 
      status: 500,
      headers: corsHeaders()
    });
  }
} 