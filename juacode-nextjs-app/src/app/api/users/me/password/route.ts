import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders(), status: 200 });
}

/**
 * Initiates a password change by sending a reset-password e-mail to the authenticated user.
 * Optionally accepts { redirect_to?: string } JSON body to control where the e-mail link lands.
 */
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header missing or invalid' }, { status: 401, headers: corsHeaders() });
    }
    const token = authHeader.substring(7);

    // Validate token / obtain user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: error?.message || 'Invalid or expired token' }, { status: 401, headers: corsHeaders() });
    }

    // Determine redirect target
    const bodyJson = (await req.json().catch(() => ({}))) as { redirect_to?: string } | undefined;
    let redirectTo: string | undefined = bodyJson?.redirect_to;
    if (!redirectTo) {
      const proto = process.env.NODE_ENV === 'development' ? 'http' : 'https';
      const host = req.headers.get('host') || 'localhost:3000';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
      redirectTo = `${siteUrl}/reset-password?email=${encodeURIComponent(user.email ?? '')}`;
    }

    // Send reset e-mail via Supabase
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email as string, {
      redirectTo,
    });

    if (resetError) {
      return NextResponse.json({ error: resetError.message || 'Failed to send password reset e-mail' }, { status: 500, headers: corsHeaders() });
    }

    return NextResponse.json({ message: 'Password reset e-mail sent. Please check your inbox.' }, { status: 200, headers: corsHeaders() });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : '';
    return NextResponse.json({ error: 'Failed to process password change', detail }, { status: 500, headers: corsHeaders() });
  }
} 