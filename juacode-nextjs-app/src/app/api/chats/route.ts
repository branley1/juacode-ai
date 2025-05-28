import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ChatCreate, Chat } from '@/models/Chat';
import { authenticateRequest } from '@/lib/auth';
// import { supabase } from '@/lib/supabaseClient'; // We might need this later for user auth

// Helper to set CORS headers
function setCorsHeaders<T>(response: NextResponse<T>): NextResponse<T> {
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// OPTIONS handler for preflight requests
export async function OPTIONS(_req: NextRequest) {
  // Use NextResponse with null body and 204 status for OPTIONS preflight
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // Optional: Cache preflight for 1 day
  return response;
}

// GET endpoint to fetch user-specific chats
export async function GET(req: NextRequest) {
  console.log('[API Chats GET /] Received request.');
  try {
    // Authenticate the user
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.user) {
      console.error('[API Chats GET /] Authentication failed:', authResult.error);
      let response = NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 });
      return setCorsHeaders(response);
    }

    const userId = authResult.user.id;
    console.log(`[API Chats GET /] Fetching chats for user: ${userId}`);

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

    console.log(`[API Chats GET /] Found ${userChats.length} chats for user ${userId}`);
    
    let response = NextResponse.json({
      message: 'Chats retrieved successfully',
      chats: userChats,
      count: userChats.length
    }, { status: 200 });
    return setCorsHeaders(response);

  } catch (error: unknown) {
    console.error('[API Chats GET /] Error in GET handler:', error);
    let errorMessage = 'Error fetching chats.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    let response = NextResponse.json({ error: errorMessage }, { status: 500 });
    return setCorsHeaders(response);
  }
}

export async function POST(req: NextRequest) {
  console.log('[API Chats POST /] Received request.');
  try {
    const body = await req.json();
    console.log('[API Chats POST /] Request body parsed:', body);
    const { chat_id, title, messages, last_model_used } = body as ChatCreate;

    if (!chat_id || !title || !messages) {
      console.error('[API Chats POST /] Validation Error: chat_id, title, and messages are required.');
      let response = NextResponse.json({ error: 'chat_id, title, and messages are required' }, { status: 400 });
      return setCorsHeaders(response);
    }

    if (!Array.isArray(messages) || messages.some(msg => typeof msg.role !== 'string' || typeof msg.content !== 'string')) {
        console.error('[API Chats POST /] Validation Error: Invalid messages format.');
        let response = NextResponse.json({ error: 'Messages must be an array of {role: string, content: string} objects' }, { status: 400 });
        return setCorsHeaders(response);
    }

    // Authenticate the user
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.user) {
      console.error('[API Chats POST /] Authentication failed:', authResult.error);
      let response = NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 });
      return setCorsHeaders(response);
    }

    const userId = authResult.user.id;
    console.log(`[API Chats POST /] Preparing to insert chat_id: ${chat_id} for user_id: ${userId}`);

    const newChatData: ChatCreate = {
      chat_id,
      title,
      messages,
      user_id: userId,
      last_model_used: last_model_used || null,
    };

    const query = `
      INSERT INTO public.chats (chat_id, title, messages, user_id, last_model_used, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING chat_id, title, messages, user_id, last_model_used, created_at, updated_at;
    `;

    const values = [
      newChatData.chat_id, 
      newChatData.title, 
      JSON.stringify(newChatData.messages), 
      newChatData.user_id,
      newChatData.last_model_used
    ];
    
    console.log('[API Chats POST /] Executing database insert query...');
    const { rows } = await db.query(query, values);
    console.log('[API Chats POST /] Database insert query completed.');
    const createdChat: Chat = rows[0];

    console.log(`[API Chats POST /] Chat ${createdChat.chat_id} saved successfully for user ${userId}.`);
    let response = NextResponse.json(
      {
        message: 'Chat saved successfully',
        chat: createdChat,
      },
      { status: 201 }
    );
    return setCorsHeaders(response);

  } catch (error: unknown) {
    console.error('[API Chats POST /] Error in POST handler:', error);
    let errorMessage = 'Error saving chat.';
    let errorStatus = 500;
    let detail = '';
    type PgError = { code?: string; message?: string };
    const pgError = error as PgError;
    if (typeof error === 'object' && error && 'code' in error) {
      if (pgError.code === '23505') {
        errorMessage = 'A chat with this ID already exists.';
        errorStatus = 409;
      } else if (pgError.code === '23503') {
        errorMessage = 'Invalid user_id provided.';
        errorStatus = 400;
      }
      if (pgError.message) detail = pgError.message;
    } else if (error instanceof Error) {
      detail = error.message;
    }
    let response = NextResponse.json({ error: errorMessage, detail }, { status: errorStatus });
    return setCorsHeaders(response);
  }
} 