import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ChatCreate, Chat } from '@/models/Chat';
// import { supabase } from '@/lib/supabaseClient'; // We might need this later for user auth

export async function POST(req: NextRequest) {
  console.log('[API Chats POST /] Received request.');
  try {
    const body = await req.json();
    console.log('[API Chats POST /] Request body parsed:', body);
    const { chat_id, title, messages, user_id: provided_user_id, last_model_used } = body as ChatCreate;

    if (!chat_id || !title || !messages) {
      console.error('[API Chats POST /] Validation Error: chat_id, title, and messages are required.');
      return NextResponse.json({ error: 'chat_id, title, and messages are required' }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.some(msg => typeof msg.role !== 'string' || typeof msg.content !== 'string')) {
        console.error('[API Chats POST /] Validation Error: Invalid messages format.');
        return NextResponse.json({ error: 'Messages must be an array of {role: string, content: string} objects' }, { status: 400 });
    }

    // Placeholder for getting authenticated user_id from Supabase if needed
    // For now, we'll use the provided_user_id or null.
    // const { data: { session } } = await supabase.auth.getSession();
    // const current_user_id = session?.user?.id || null;
    const user_id_to_insert = provided_user_id || null; 
    console.log(`[API Chats POST /] Preparing to insert chat_id: ${chat_id} for user_id: ${user_id_to_insert}`);

    const newChatData: ChatCreate = {
      chat_id,
      title,
      messages,
      user_id: user_id_to_insert,
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

    console.log(`[API Chats POST /] Chat ${createdChat.chat_id} saved successfully.`);
    return NextResponse.json(
      {
        message: 'Chat saved successfully',
        chat: createdChat,
      },
      { status: 201 }
    );

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
    return NextResponse.json({ error: errorMessage, detail }, { status: errorStatus });
  }
} 