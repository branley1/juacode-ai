import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { db } from '@/lib/db';
import { UserPublic } from '@/models/User';

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

function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must include at least one uppercase letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: "Password must include at least one digit" };
  }
  if (!/[!@#$%^&*(),.?\\":{}|<>]/.test(password)) { 
    return { isValid: false, message: "Password must include at least one special character" };
  }
  return { isValid: true };
}

export async function POST(req: NextRequest) {
  
  // Add CORS headers to all responses
  const responseHeaders = corsHeaders();
  
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400, headers: responseHeaders });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ error: passwordValidation.message }, { status: 400, headers: responseHeaders });
    }

    // First, check if email already exists in our database (ensure uniqueness)
    try {
      const { rows } = await db.query('SELECT email FROM users WHERE email = $1', [email]);
      if (rows.length > 0) {
        return NextResponse.json(
          { error: 'This email address is already registered. Please check your inbox (and spam folder) for a confirmation email, or try logging in.' }, 
          { status: 409, headers: responseHeaders }
        );
      }
    } catch (err) {
      // Decide if this should be a hard stop or if Supabase check is sufficient
      // For now, let's make it a hard stop to avoid duplicate Supabase user creation if DB check fails critically
       return NextResponse.json({ error: 'Failed to verify email uniqueness due to a database error.' }, { status: 500, headers: responseHeaders });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
        }
      }
    });

    if (authError) {
      // If Supabase itself is rate-limiting, pass that error back directly.
      if (authError.status === 429) {
        return NextResponse.json(
          { error: 'Too many registration attempts. Please wait a minute and try again.', code: 'supabase_rate_limited', detail: authError.message }, 
          { status: 429, headers: responseHeaders }
        );
      }
      if (authError.message.includes("User already registered")) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409, headers: responseHeaders });
      }
      const response = NextResponse.json(
        { error: authError.message || 'Supabase sign up failed' }, 
        { status: authError.status || 500, headers: responseHeaders }
      );
      return response;
    }

    if (!authData.user) {
      const response = NextResponse.json(
        { error: 'Supabase sign up succeeded but no user data returned' }, 
        { status: 500, headers: responseHeaders }
      );
      return response;
    }

    const supabaseUserId = authData.user.id;

    try {
      const query = `
        INSERT INTO users (id, name, email, created_at, updated_at)
        OVERRIDING SYSTEM VALUE
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, name, email, created_at, updated_at;
      `;
      const values = [supabaseUserId, name, email];
      const { rows } = await db.query(query, values);
      
      const createdUser: UserPublic = rows[0];

      const successResponse = NextResponse.json(
        {
          message: 'User registered successfully. Please check your email to confirm.',
          user: createdUser,
          supabase_user_id: supabaseUserId,
        },
        { status: 201, headers: responseHeaders }
      );
      return successResponse;

    } catch (dbError: unknown) {
      let errorMessage = 'Failed to save user profile to database after Supabase registration.';
      let errorStatus = 500;
      let detail = '';
      type PgError = { code?: string; constraint?: string; message?: string; detail?: string };
      const pgError = dbError as PgError;
      
      if (typeof dbError === 'object' && dbError && 'code' in dbError) {
        if (pgError.code === '23505') { 
          if (pgError.constraint === 'users_email_key'){
             errorMessage = 'This email address is already registered. Please check your inbox (and spam folder) for a confirmation email, or try logging in.';
             errorStatus = 409;
          } else if (pgError.constraint === 'users_pkey'){
              errorMessage = 'User profile with this ID already exists.';
              errorStatus = 409;
          }
        }
        if (pgError.message) detail = pgError.message;
        if (pgError.detail) detail += ' ' + pgError.detail;
      } else if (dbError instanceof Error) {
        detail = dbError.message;
      }
      const dbErrorResponse = NextResponse.json({ error: errorMessage, detail }, { status: errorStatus, headers: responseHeaders });
      return dbErrorResponse;
    }

  } catch (error: unknown) {
    const message = 'User registration failed due to an unexpected server error.';
    let detail = '';
    if (error instanceof Error) detail = error.message;
    const generalErrorResponse = NextResponse.json({ error: message, detail }, { status: 500, headers: responseHeaders });
    return generalErrorResponse;
  }
} 