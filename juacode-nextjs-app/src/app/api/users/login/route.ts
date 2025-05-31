import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { db } from '@/lib/db';

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
    const { email, password, bypass_confirmation } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { 
        status: 400,
        headers: corsHeaders()
      });
    }

    // If bypass_confirmation is true and we're in a development environment, 
    // allow login without email confirmation (for testing only)
    if (bypass_confirmation && process.env.NODE_ENV === 'development') {
      
      // First try to sign in - this might fail if email is not confirmed
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      // If it succeeded, great - just return the response
      if (!error && data) {
        // After successful login, ensure a corresponding user profile row exists in the local "users" table.
        try {
          // Attempt to insert (or do nothing on conflict) so that repeated logins are idempotent.
          const upsertQuery = `
            INSERT INTO users (id, name, email, created_at, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE
            SET email = EXCLUDED.email,
                updated_at = CURRENT_TIMESTAMP;
          `;
          const upsertValues = [data.user.id, data.user.user_metadata?.name || null, data.user.email];
          await db.query(upsertQuery, upsertValues);
        } catch (profileError) {
          // Log but do not fail the login if profile insert fails; chats may still fail separately and expose the error.
        }

        return NextResponse.json(
          {
            message: 'User logged in successfully',
            access_token: data.session.access_token,
            token_type: 'bearer',
            user: {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name || null 
            },
            session: data.session 
          },
          { 
            status: 200,
            headers: corsHeaders()
          }
        );
      }
      
      // If it failed with an email confirmation error, try to get the user data from our database
      if (error && error.message.includes('Email not confirmed')) {
        // Get the user data from our database
        try {
          const { rows } = await db.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
          if (rows.length > 0) {
            const userData = rows[0];
            
            // Log it but don't auto-confirm in production
            
            return NextResponse.json(
              {
                message: 'Test login successful, but email confirmation would be required in production',
                user: userData,
                test_mode: true
              },
              { 
                status: 200,
                headers: corsHeaders()
              }
            );
          }
        } catch (dbError) {
        }
      }
    }

    // Normal login flow
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      
      if (error.message.includes('Email not confirmed')) {
        return NextResponse.json({ 
          error: 'Email not confirmed. Please check your inbox for a confirmation email.',
          code: 'email_not_confirmed'
        }, { 
          status: 400,
          headers: corsHeaders()
        });
      }
      
      if (error.message.includes('Invalid login credentials')) {
         return NextResponse.json({ error: 'Invalid email or password' }, { 
           status: 401,
           headers: corsHeaders()
         });
      }
      
      return NextResponse.json({ error: error.message || 'Sign in failed' }, { 
        status: error.status || 500,
        headers: corsHeaders()
      });
    }

    if (!data || !data.session || !data.user) {
        return NextResponse.json({ error: 'Sign in succeeded but no session or user data returned' }, { 
          status: 500,
          headers: corsHeaders()
        });
    }

    // After successful login, ensure a corresponding user profile row exists in the local "users" table.
    try {
      // Attempt to insert (or do nothing on conflict) so that repeated logins are idempotent.
      const upsertQuery = `
        INSERT INTO users (id, name, email, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            updated_at = CURRENT_TIMESTAMP;
      `;
      const upsertValues = [data.user.id, data.user.user_metadata?.name || null, data.user.email];
      await db.query(upsertQuery, upsertValues);
    } catch (profileError) {
      // Log but do not fail the login if profile insert fails; chats may still fail separately and expose the error.
    }

    return NextResponse.json(
      {
        message: 'User logged in successfully',
        access_token: data.session.access_token,
        token_type: 'bearer',
        user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || null 
        },
        session: data.session 
      },
      { 
        status: 200,
        headers: corsHeaders()
      }
    );

  } catch (error: unknown) {
    const message = 'Login failed.';
    let detail = '';
    if (error instanceof Error) detail = error.message;
    return NextResponse.json({ error: message, detail }, { 
      status: 500,
      headers: corsHeaders()
    });
  }
} 