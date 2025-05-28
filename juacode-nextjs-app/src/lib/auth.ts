import { NextRequest } from 'next/server';
import { supabase } from './supabaseClient';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Extract and validate user authentication from request headers
 * Expects Authorization header with Bearer token from Supabase
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || null
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Authenticates the request. This is now a direct pass-through to `authenticateRequest`.
 * The fallback logic for development has been removed.
 */
export async function authenticateRequestFallback(req: NextRequest): Promise<AuthResult> {
  // Fallback logic has been removed. Directly use authenticateRequest.
  console.log('[AUTH] authenticateRequestFallback called, redirecting to authenticateRequest.');
  return await authenticateRequest(req);
} 