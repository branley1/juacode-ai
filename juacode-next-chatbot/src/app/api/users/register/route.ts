// app/api/users/register/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();
    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Basic password validation (you can enhance this as needed)
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('users')
      .insert([{ username, email, hashed_password: hashedPassword }]);
    if (error) throw error;
    return NextResponse.json({ message: 'User registered successfully', user: data });
  } catch (error: any) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: `User registration failed: ${error.message}` },
      { status: 500 }
    );
  }
}
