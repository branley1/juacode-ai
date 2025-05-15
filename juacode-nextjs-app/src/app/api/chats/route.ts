import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ChatCreate, Chat, ChatMessage } from '@/models/Chat';
// import { supabase } from '@/lib/supabaseClient'; // We might need this later for user auth

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chat_id, title, messages, user_id: provided_user_id, last_model_used } = body as ChatCreate;

    if (!chat_id || !title || !messages) {
      return NextResponse.json({ error: 'chat_id, title, and messages are required' }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.some(msg => typeof msg.role !== 'string' || typeof msg.content !== 'string')) {
        return NextResponse.json({ error: 'Messages must be an array of {role: string, content: string} objects' }, { status: 400 });
    }

    // Placeholder for getting authenticated user_id from Supabase if needed
    // For now, we'll use the provided_user_id or null.
    // const { data: { session } } = await supabase.auth.getSession();
    // const current_user_id = session?.user?.id || null;
    const user_id_to_insert = provided_user_id || null; 

    const newChatData: ChatCreate = {
      chat_id,
      title,
      messages,
      user_id: user_id_to_insert,
      last_model_used: last_model_used || null,
    };

    const query = `
      INSERT INTO chats (chat_id, title, messages, user_id, last_model_used, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING chat_id, title, messages, user_id, last_model_used, created_at, updated_at;
    `;

    const values = [
      newChatData.chat_id, 
      newChatData.title, 
      newChatData.messages, 
      newChatData.user_id,
      newChatData.last_model_used
    ];
    
    const { rows } = await db.query(query, values);
    const createdChat: Chat = rows[0];

    return NextResponse.json(
      {
        message: 'Chat saved successfully',
        chat: createdChat,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating chat:', error);
    let errorMessage = 'Error saving chat.';
    let errorStatus = 500;

    if (error.code === '23505') {
      errorMessage = 'A chat with this ID already exists.';
      errorStatus = 409;
    } else if (error.code === '23503') {
      errorMessage = 'Invalid user_id provided.';
      errorStatus = 400;
    }
    
    return NextResponse.json({ error: errorMessage, detail: error.message }, { status: errorStatus });
  }
} 