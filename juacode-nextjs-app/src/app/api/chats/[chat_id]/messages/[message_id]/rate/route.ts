import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthHeaders } from '@/utils/api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: { chat_id: string; message_id: string } }
) {
  try {
    const { chat_id, message_id } = params;
    const { rating } = await request.json();

    if (!rating || !['good', 'bad'].includes(rating)) {
      return NextResponse.json(
        { error: 'Invalid rating value' },
        { status: 400 }
      );
    }

    // Verify user has access to this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', chat_id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Update the message rating
    const { error: updateError } = await supabase
      .from('messages')
      .update({ rating })
      .eq('id', message_id)
      .eq('chat_id', chat_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update message rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 