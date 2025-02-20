// app/api/users/login/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET_KEY!;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const isValid = await bcrypt.compare(password, user.hashed_password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    // Create JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30m' });
    return NextResponse.json({ access_token: token, token_type: 'bearer' });
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: `Login failed: ${error.message}` },
      { status: 500 }
    );
  }
}
