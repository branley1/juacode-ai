import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Use Supabase client
import { db } from '@/lib/db'; // Use pg client for profile data

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header missing or invalid' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Validate token with Supabase
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser(token);

    if (supabaseError || !supabaseUser) {
      console.error('[API /users/me] Supabase token validation failed:', supabaseError);
      return NextResponse.json({ error: supabaseError?.message || 'Invalid or expired token' }, { status: 401 });
    }

    // Fetch user profile from your 'users' table using the Supabase user ID
    // The Supabase user ID should be the one stored in your 'users' table 'id' column.
    const profileQuery = 'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1';
    const { rows } = await db.query(profileQuery, [supabaseUser.id]);

    if (rows.length === 0) {
      // This case might mean the user exists in Supabase auth but not in your public users table yet.
      // Depending on your app logic, you might create it here or consider it an error.
      // For now, we'll treat it as user not found in the profile table.
      console.warn(`[API /users/me] User ${supabaseUser.id} found in Supabase auth but not in local profile table.`);
      // Optionally, you could return parts of supabaseUser if that's acceptable, 
      // or enforce profile existence more strictly.
      // For consistency with the AuthContext User type, we try to return a full profile.
      // If your users table might not have an is_admin, adjust the query and User type.
      return NextResponse.json({ error: 'User profile not found in database.' }, { status: 404 });
    }

    const userProfile = rows[0];

    // Map to the User interface used in AuthContext
    const responseUser = {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.name,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at,
    };

    return NextResponse.json(responseUser, { status: 200 });

  } catch (error) {
    console.error('[API /users/me] Error fetching user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 