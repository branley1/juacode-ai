// app/api/chats/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { chat_id, title, messages } = await request.json();
    if (!chat_id || !title || !messages) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('chats')
      .insert([{ chat_id, title, messages }]);
    if (error) throw error;
    return NextResponse.json({ message: 'Chat saved successfully', chat: data });
  } catch (error: any) {
    console.error('Error saving chat:', error);
    return NextResponse.json(
      { error: `Error saving chat: ${error.message}` },
      { status: 500 }
    );
  }
}
