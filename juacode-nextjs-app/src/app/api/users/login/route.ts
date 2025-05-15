import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Supabase sign in error:', error);
      if (error.message.includes('Invalid login credentials')) {
         return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      return NextResponse.json({ error: error.message || 'Sign in failed' }, { status: error.status || 500 });
    }

    if (!data || !data.session || !data.user) {
        return NextResponse.json({ error: 'Sign in succeeded but no session or user data returned' }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: 'User logged in successfully',
        access_token: data.session.access_token,
        token_type: 'bearer',
        user: {
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata?.username || null 
        },
        session: data.session 
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed.', detail: error.message }, { status: 500 });
  }
} 