import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { db } from '@/lib/db';
import { UserProfileCreate, UserPublic } from '@/models/User';

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
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) { 
    return { isValid: false, message: "Password must include at least one special character" };
  }
  return { isValid: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
        }
      }
    });

    if (authError) {
      console.error('Supabase sign up error:', authError);
      if (authError.message.includes("User already registered")) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message || 'Supabase sign up failed' }, { status: authError.status || 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Supabase sign up succeeded but no user data returned' }, { status: 500 });
    }

    const supabaseUserId = authData.user.id;

    const newUserProfile: UserProfileCreate = {
      id: supabaseUserId,
      username,
      email, 
    };

    try {
      const query = `
        INSERT INTO users (id, username, email, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, username, email, created_at, updated_at;
      `;
      const values = [newUserProfile.id, newUserProfile.username, newUserProfile.email];
      const { rows } = await db.query(query, values);
      
      const createdUser: UserPublic = rows[0];

      return NextResponse.json(
        {
          message: 'User registered successfully. Please check your email to confirm.',
          user: createdUser,
          supabase_user_id: supabaseUserId,
        },
        { status: 201 }
      );

    } catch (dbError: unknown) {
      console.error('Database insert error after Supabase sign up:', dbError);
      let errorMessage = 'Failed to save user profile to database after Supabase registration.';
      let errorStatus = 500;
      let detail = '';
      if (typeof dbError === 'object' && dbError && 'code' in dbError) {
        if ((dbError as any).code === '23505') { 
          if ((dbError as any).constraint === 'users_username_key') {
            errorMessage = 'Username already taken. Please try a different username.';
            errorStatus = 409;
          } else if ((dbError as any).constraint === 'users_email_key'){
             errorMessage = 'Email already registered in profiles. Please try to login.';
             errorStatus = 409;
          } else if ((dbError as any).constraint === 'users_pkey'){
              errorMessage = 'User profile with this ID already exists.';
              errorStatus = 409;
          }
        }
        if ('message' in dbError) detail = (dbError as any).message;
      } else if (dbError instanceof Error) {
        detail = dbError.message;
      }
      return NextResponse.json({ error: errorMessage, detail }, { status: errorStatus });
    }

  } catch (error: unknown) {
    console.error('User registration error:', error);
    let message = 'User registration failed.';
    let detail = '';
    if (error instanceof Error) detail = error.message;
    return NextResponse.json({ error: message, detail }, { status: 500 });
  }
} 