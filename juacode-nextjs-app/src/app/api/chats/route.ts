import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ChatCreate, Chat } from '@/models/Chat';
import { authenticateRequest } from '@/lib/auth';
// import { supabase } from '@/lib/supabaseClient'; // We might need this later for user auth

// Helper to set CORS headers
function setCorsHeaders<T>(response: NextResponse<T>): NextResponse<T> {
  const origin = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000'
    : 'https://juacode.netlify.app/';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// OPTIONS handler for preflight requests
export async function OPTIONS() {
  // Use NextResponse with null body and 204 status for OPTIONS preflight
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', 'https://juacode.netlify.app/');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // Optional: Cache preflight for 1 day
  return response;
}

// GET endpoint to fetch user-specific chats
export async function GET(req: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.user) {
      const response = NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 });
      return setCorsHeaders(response);
    }

    const userId = authResult.user.id;

    // Fetch chats for the authenticated user
    const query = `
      SELECT chat_id, title, messages, user_id, last_model_used, created_at, updated_at
      FROM chats 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `;
    
    const { rows } = await db.query(query, [userId]);
    
    const userChats: Chat[] = rows.map(row => ({
      ...row,
      messages: typeof row.messages === 'string' ? JSON.parse(row.messages) : row.messages
    }));

    
    const response = NextResponse.json({
      message: 'Chats retrieved successfully',
      chats: userChats,
      count: userChats.length
    }, { status: 200 });
    return setCorsHeaders(response);

  } catch (error: unknown) {
    let errorMessage = 'Error fetching chats.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    const finalResponse = NextResponse.json({ error: errorMessage }, { status: 500 });
    return setCorsHeaders(finalResponse);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chat_id, title, messages, last_model_used } = body as ChatCreate;

    if (!chat_id || !title || !messages) {
      const response = NextResponse.json({ error: 'chat_id, title, and messages are required' }, { status: 400 });
      return setCorsHeaders(response);
    }

    if (!Array.isArray(messages) || messages.some(msg => typeof msg.role !== 'string' || typeof msg.content !== 'string')) {
        const response = NextResponse.json({ error: 'Messages must be an array of {role: string, content: string} objects' }, { status: 400 });
        return setCorsHeaders(response);
    }

    // Authenticate the user
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.user) {
      const response = NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 });
      return setCorsHeaders(response);
    }

    const userId = authResult.user.id;

    const newChatData: ChatCreate = {
      chat_id,
      title,
      messages,
      user_id: userId,
      last_model_used: last_model_used || null,
    };

    // Try updating an existing chat
    const values = [
      newChatData.chat_id,
      newChatData.title,
      JSON.stringify(newChatData.messages),
      newChatData.user_id,
      newChatData.last_model_used
    ];
    const updateQuery = `
      UPDATE public.chats
      SET title = $2,
          messages = $3,
          last_model_used = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE chat_id = $1 AND user_id = $4
      RETURNING chat_id, title, messages, user_id, last_model_used, created_at, updated_at;
    `;
    const updateResult = await db.query(updateQuery, values);
    if (updateResult.rows.length > 0) {
      const updatedChat = updateResult.rows[0] as Chat;
      const response = NextResponse.json(
        { message: 'Chat updated successfully', chat: updatedChat },
        { status: 200 }
      );
      return setCorsHeaders(response);
    }
    // No existing chat - insert new
    const insertQuery = `
      INSERT INTO public.chats (
        chat_id,
        title,
        messages,
        user_id,
        last_model_used,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING chat_id, title, messages, user_id, last_model_used, created_at, updated_at;
    `;
    const insertResult = await db.query(insertQuery, values);
    const createdChat = insertResult.rows[0] as Chat;
    const response = NextResponse.json(
      { message: 'Chat created successfully', chat: createdChat },
      { status: 201 }
    );
    return setCorsHeaders(response);

  } catch (error: unknown) {
    let errorMessage = 'Error saving chat.';
    let errorStatus = 500;
    let detail = '';
    type PgError = { code?: string; message?: string };
    const pgError = error as PgError;
    if (typeof error === 'object' && error && 'code' in error) {
      if (pgError.code === '23503') {
        errorMessage = 'Invalid user_id provided.';
        errorStatus = 400;
      }
      if (pgError.message) detail = pgError.message;
    } else if (error instanceof Error) {
      detail = error.message;
    }
    const errorResponse = NextResponse.json({ error: errorMessage, detail }, { status: errorStatus });
    return setCorsHeaders(errorResponse);
  }
} 