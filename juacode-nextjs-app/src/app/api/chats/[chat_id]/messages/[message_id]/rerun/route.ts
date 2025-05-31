import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthHeaders } from '@/utils/api';
import { generateChatCompletion } from '@/lib/llmService';

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
    const { model } = await request.json();

    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    // Get the message to rerun
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', message_id)
      .eq('chat_id', chat_id)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Get the previous messages in the chat for context
    const { data: previousMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat_id)
      .lt('created_at', message.created_at)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch previous messages' },
        { status: 500 }
      );
    }

    // Generate new response with the selected model
    const llmMessages = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await generateChatCompletion(
      model.startsWith('o4-') ? 'openai' : 
      model.startsWith('gemini') ? 'gemini' : 'deepseek',
      llmMessages,
      {
        model,
        temperature: 0.7,
        max_tokens: 1000
      }
    );

    if (typeof response === 'string') {
      // Update the message with the new content and model
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          content: response,
          model,
          updated_at: new Date().toISOString()
        })
        .eq('id', message_id)
        .eq('chat_id', chat_id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update message' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        content: response,
        model
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to generate response' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 