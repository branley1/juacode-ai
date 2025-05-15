import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ChatUpdate, Chat, ChatMessage } from '@/models/Chat';
import { LLMMessage, generateChatCompletion, LLMConfig, LLMProvider } from '@/lib/llmService';

interface RouteParams {
  chat_id: string;
}

export async function PUT(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { chat_id } = params;
    const body = await req.json() as ChatUpdate;
    const { title, messages, last_model_used } = body;

    if (!chat_id) {
      return NextResponse.json({ error: 'chat_id is required in the URL' }, { status: 400 });
    }

    if (title === undefined && messages === undefined && last_model_used === undefined) {
      return NextResponse.json({ error: 'At least title, messages, or last_model_used must be provided for update' }, { status: 400 });
    }

    if (messages !== undefined && (!Array.isArray(messages) || messages.some(msg => typeof msg.role !== 'string' || typeof msg.content !== 'string'))) {
      return NextResponse.json({ error: 'If provided, messages must be an array of {role: string, content: string} objects' }, { status: 400 });
    }

    // Dynamically build the SET part of the query and the values array
    const setClauses: string[] = [];
    const values: any[] = [];
    let valueCount = 1;

    if (title !== undefined) {
      setClauses.push(`title = $${valueCount++}`);
      values.push(title);
    }

    if (messages !== undefined) {
      setClauses.push(`messages = $${valueCount++}`);
      values.push(messages);
    }

    if (last_model_used !== undefined) {
      setClauses.push(`last_model_used = $${valueCount++}`);
      values.push(last_model_used);
    }

    if (setClauses.length === 0) {
      // This case should be caught by the check above, but as a safeguard
      return NextResponse.json({ message: 'No changes provided to update' }, { status: 200 });
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(chat_id); // For the WHERE clause

    const query = `
      UPDATE chats
      SET ${setClauses.join(', ')}
      WHERE chat_id = $${valueCount}
      RETURNING chat_id, title, messages, user_id, last_model_used, created_at, updated_at;
    `;

    const { rows, rowCount } = await db.query(query, values);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Chat not found or no changes made' }, { status: 404 });
    }

    const updatedChat: Chat = rows[0];

    return NextResponse.json(
      {
        message: 'Chat updated successfully',
        chat: updatedChat,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error updating chat:', error);
    // Add more specific error handling if needed (e.g., for invalid JSON in messages if not caught by validation)
    return NextResponse.json({ error: 'Error updating chat.', detail: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { chat_id } = params;

    if (!chat_id) {
      return NextResponse.json({ error: 'chat_id is required in the URL' }, { status: 400 });
    }

    // Fetch chat from DB
    const chatQuery = 'SELECT messages FROM chats WHERE chat_id = $1';
    const { rows, rowCount } = await db.query(chatQuery, [chat_id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const chatMessagesFromDB: ChatMessage[] = rows[0].messages;

    if (!chatMessagesFromDB || chatMessagesFromDB.length === 0) {
      return NextResponse.json({ error: 'No messages in chat to summarize title from' }, { status: 400 });
    }

    // Prepare messages for LLM
    const messagesForSummary = chatMessagesFromDB.slice(0, 4);
    
    const llmMessages: LLMMessage[] = messagesForSummary.map((msg: ChatMessage) => {
        // Replace /<think>.*?<\/think>/gs with a more compatible regex
        const contentForSummary = msg.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        let role: LLMMessage['role'] = 'user'; 
        if (msg.role === 'assistant') role = 'model'; 
        else if (msg.role === 'system') role = 'system';
        else if (msg.role === 'user') role = 'user';
        
        return {
            role: role,
            content: contentForSummary || msg.content, 
        };
    }).filter(msg => msg.content) as LLMMessage[];

    if (llmMessages.length === 0) {
        return NextResponse.json({ error: 'Not enough content after processing messages to summarize title.' }, { status: 400 });
    }
    
    const systemPromptText = "Create a short, concise chat title of 2-5 words that summarizes the core topic or purpose of this conversation. Focus on the specific subject matter. Do not include phrases like 'I am' or self-references. Only output the title with no quotes or other formatting.";
    const systemPrompt: LLMMessage = {
      role: 'system',
      content: systemPromptText
    };

    const titleGenerationPayload: LLMMessage[] = [systemPrompt, ...llmMessages];

    // Call LLM to generate title
    const llmProvider: LLMProvider = (process.env.TITLE_GENERATION_LLM_PROVIDER as LLMProvider) || 'gemini';
    const llmConfig: LLMConfig = {
      stream: false, 
      max_tokens: 20, 
      temperature: 0.5,
    };
    
    console.log(`[Chat Title Summary] Using provider: ${llmProvider} for chat_id: ${chat_id}`);

    let newTitleRaw: string | AsyncGenerator<string, void, unknown>;
    try {
        newTitleRaw = await generateChatCompletion(llmProvider, titleGenerationPayload, llmConfig);
    } catch (llmError: any) {
        console.error(`[Chat Title Summary] LLM (${llmProvider}) error for chat ${chat_id}:`, llmError);
         return NextResponse.json({ error: 'LLM service error during title generation.', detail: llmError.message }, { status: 502 });
    }

    if (typeof newTitleRaw !== 'string' || !newTitleRaw.trim()) {
      console.warn(`[Chat Title Summary] LLM (${llmProvider}) returned empty or invalid title for chat ${chat_id}. Using default.`);
      newTitleRaw = "Chat Summary"; 
    }

    // Clean and format title
    let newTitle = newTitleRaw.replace(/["'*`~#""]/g, '').trim();
    const words = newTitle.split(/\s+/);
    if (words.length > 5) {
      newTitle = words.slice(0, 5).join(' ');
    } else if (words.length === 0 || newTitle.length === 0) {
      newTitle = "Chat Summary"; 
    }
    
    // Update chat in DB
    const updateQuery = `
      UPDATE chats
      SET title = $1, updated_at = CURRENT_TIMESTAMP
      WHERE chat_id = $2
      RETURNING chat_id, title;
    `;
    const updateValues = [newTitle, chat_id];
    const { rows: updatedRows, rowCount: updatedRowCount } = await db.query(updateQuery, updateValues);

    if (updatedRowCount === 0) {
      return NextResponse.json({ error: 'Chat not found during update' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Chat title summarized and updated successfully',
        chat_id: updatedRows[0].chat_id,
        title: updatedRows[0].title,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error(`[Chat Title Summary] Error for chat_id ${params.chat_id}:`, error);
    if (error.code === '22P02' && error.message.includes('JSON')) { 
        return NextResponse.json({ error: 'Invalid message format in stored chat.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Error summarizing chat title.', detail: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: RouteParams }) {
  const chatId = params.chat_id;
  try {
    const result = await db.query('DELETE FROM chats WHERE chat_id = $1 RETURNING chat_id', [chatId]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    return NextResponse.json({ message: `Chat ${chatId} deleted successfully` });
  } catch (error) {
    console.error(`Error deleting chat ${chatId}:`, error);
    return NextResponse.json({ error: `Failed to delete chat ${chatId}` }, { status: 500 });
  }
} 