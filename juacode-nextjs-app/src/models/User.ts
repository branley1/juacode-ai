// User model
export interface User {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfileCreate {
  id: string; // Supabase User ID
  name: string;
  email: string;
}

// User login
export interface UserLogin {
  email: string;
  password: string;
}

// Data to return for a user profile (publicly safe)
export interface UserPublic {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
} 