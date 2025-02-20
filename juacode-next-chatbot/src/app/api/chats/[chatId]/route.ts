// app/api/chats/[chatId]/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PUT(request: Request, { params }: { params: { chatId: string } }) {
  try {
    const { title } = await request.json();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('chats')
      .update({ title })
      .eq('chat_id', params.chatId);
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Chat title updated successfully', chat: data[0] });
  } catch (error: any) {
    console.error('Error updating chat title:', error);
    return NextResponse.json(
      { error: `Error updating chat title: ${error.message}` },
      { status: 500 }
    );
  }
}
