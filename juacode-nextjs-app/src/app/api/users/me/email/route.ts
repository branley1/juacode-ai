import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { db } from '@/lib/db';

// Next.js route handler config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Helper: common CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Handle CORS pre-flight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders(), status: 200 });
}

/**
 * Change the authenticated user's email address.
 * Expects JSON body: { new_email: string, current_password?: string }
 * A verification e-mail will be sent by Supabase to complete the change.
 */
export async function PATCH(req: NextRequest) {
  try {
    // -----------------------------
    // 1. Authentication & token
    // -----------------------------
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header missing or invalid' }, { status: 401, headers: corsHeaders() });
    }
    const bearerToken = authHeader.substring(7);

    // Retrieve user from token (verifies token validity)
    const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser(bearerToken);
    if (userError || !supabaseUser) {
      return NextResponse.json({ error: userError?.message || 'Invalid or expired token' }, { status: 401, headers: corsHeaders() });
    }

    // -----------------------------
    // 2. Parse & validate payload
    // -----------------------------
    const body = await req.json();
    const { new_email, current_password } = body;

    if (!new_email || typeof new_email !== 'string') {
      return NextResponse.json({ error: 'new_email is required' }, { status: 400, headers: corsHeaders() });
    }

    // Simple e-mail regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      return NextResponse.json({ error: 'Invalid e-mail format' }, { status: 400, headers: corsHeaders() });
    }

    // Prevent redundant update
    if (new_email.toLowerCase() === (supabaseUser.email ?? '').toLowerCase()) {
      return NextResponse.json({ error: 'The new e-mail is the same as the current one' }, { status: 400, headers: corsHeaders() });
    }

    // -----------------------------
    // 3. Optionally verify password
    // -----------------------------
    let sessionAccessToken: string | null = null;
    let sessionRefreshToken: string | null = null;

    if (current_password && typeof current_password === 'string') {
      // Re-authenticate using the supplied current password for additional security
      const { data, error } = await supabase.auth.signInWithPassword({
        email: supabaseUser.email as string,
        password: current_password,
      });

      if (error || !data || !data.session) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401, headers: corsHeaders() });
      }
      sessionAccessToken = data.session.access_token;
      sessionRefreshToken = data.session.refresh_token;
      // Establish the session for subsequent call
      await supabase.auth.setSession({
        access_token: sessionAccessToken,
        refresh_token: sessionRefreshToken,
      });
    } else {
      // If no password provided, fall back to the bearer token for updateUser
      await supabase.auth.setSession({ access_token: bearerToken, refresh_token: '' });
    }

    // -----------------------------
    // 4. Update e-mail via Supabase
    // -----------------------------
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      email: new_email as string,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to initiate e-mail change' }, { status: 500, headers: corsHeaders() });
    }

    // -----------------------------
    // 5. Update mirrored profile record (optional – reflect pending email)
    // -----------------------------
    try {
      const updateQuery = `UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
      await db.query(updateQuery, [new_email, supabaseUser.id]);
    } catch (dbErr) {
      // Ignore DB errors – e-mail change still queued in Supabase Auth
    }

    return NextResponse.json(
      {
        message: 'E-mail change requested. Please check both your current and new e-mail inboxes for verification links.',
        user: updateData?.user ?? null,
      },
      { status: 200, headers: corsHeaders() }
    );
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : '';
    return NextResponse.json({ error: 'Failed to process e-mail change', detail }, { status: 500, headers: corsHeaders() });
  }
} 