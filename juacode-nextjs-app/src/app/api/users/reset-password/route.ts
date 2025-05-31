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
    const { password, access_token, refresh_token } = body;

    if (!password) {
      return NextResponse.json({ 
        error: 'New password is required' 
      }, { 
        status: 400,
        headers: corsHeaders()
      });
    }

    if (!access_token) {
      return NextResponse.json({ 
        error: 'Access token is required' 
      }, { 
        status: 400,
        headers: corsHeaders()
      });
    }

    // Validate password strength (basic validation)
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { 
        status: 400,
        headers: corsHeaders()
      });
    }

    // Set the session with the access token from the reset link
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError) {
      return NextResponse.json({ 
        error: 'Invalid or expired reset link' 
      }, { 
        status: 400,
        headers: corsHeaders()
      });
    }

    // Update the user's password
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to update password. Please try again.' 
      }, { 
        status: 500,
        headers: corsHeaders()
      });
    }

    return NextResponse.json({
      message: 'Password updated successfully. You can now log in with your new password.',
      success: true
    }, { 
      status: 200,
      headers: corsHeaders()
    });

  } catch (error: unknown) {
    const message = 'Failed to reset password.';
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