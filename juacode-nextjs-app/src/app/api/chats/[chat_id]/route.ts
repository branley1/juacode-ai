import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ChatUpdate, Chat, ChatMessage } from '@/models/Chat';
import { LLMMessage, generateChatCompletion, LLMConfig, LLMProvider } from '@/lib/llmService';
import { authenticateRequest } from '@/lib/auth';

interface RouteParams {
  chat_id: string;
}

// Helper to set CORS headers
function setCorsHeaders<T>(response: NextResponse<T>): NextResponse<T> {
  response.headers.set('Access-Control-Allow-Origin', 'https://juacode.netlify.app/');
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

export async function PUT(req: NextRequest, context: { params: Promise<RouteParams> }) {
  try {
    const body = await req.json() as ChatUpdate;
    const { chat_id } = await context.params;
    const { title, messages, last_model_used } = body;

    if (!chat_id) {
      const R = NextResponse.json({ error: 'chat_id is required in the URL' }, { status: 400 });
      return setCorsHeaders(R);
    }

    if (title === undefined && messages === undefined && last_model_used === undefined) {
      const R = NextResponse.json({ error: 'At least title, messages, or last_model_used must be provided for update' }, { status: 400 });
      return setCorsHeaders(R);
    }

    if (messages !== undefined && (!Array.isArray(messages) || messages.some(msg => typeof msg.role !== 'string' || typeof msg.content !== 'string'))) {
      const R = NextResponse.json({ error: 'If provided, messages must be an array of {role: string, content: string} objects' }, { status: 400 });
      return setCorsHeaders(R);
    }

    // Authenticate the user
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.user) {
      const R = NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 });
      return setCorsHeaders(R);
    }

    const userId = authResult.user.id;

    // Dynamically build the SET part of the query and the values array
    const setClauses: string[] = [];
    const values: (string | number | object | null)[] = [];
    let valueCount = 1;

    if (title !== undefined) {
      setClauses.push(`title = $${valueCount++}`);
      values.push(title);
    }

    if (messages !== undefined) {
      setClauses.push(`messages = $${valueCount++}`);
      values.push(JSON.stringify(messages));
    }

    if (last_model_used !== undefined) {
      setClauses.push(`last_model_used = $${valueCount++}`);
      values.push(last_model_used);
    }

    if (setClauses.length === 0) {
      const R = NextResponse.json({ message: 'No changes provided to update' }, { status: 200 });
      return setCorsHeaders(R);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(chat_id);
    values.push(userId); // Add user_id for WHERE clause

    const query = `
      UPDATE chats
      SET ${setClauses.join(', ')}
      WHERE chat_id = $${valueCount} AND user_id = $${valueCount + 1}
      RETURNING chat_id, title, messages, user_id, last_model_used, created_at, updated_at;
    `;

    const { rows, rowCount } = await db.query(query, values);

    if (rowCount === 0) {
      const R = NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
      return setCorsHeaders(R);
    }

    const updatedChat: Chat = rows[0];

    const Rfinal = NextResponse.json(
      {
        message: 'Chat updated successfully',
        chat: updatedChat,
      },
      { status: 200 }
    );
    return setCorsHeaders(Rfinal);

  } catch (error: unknown) {
    let message = 'Error updating chat.';
    if (error instanceof Error) message = error.message;
    type PgError = { code?: string; message?: string };
    const pgError = error as PgError;
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      pgError.code === '22P02' &&
      pgError.message &&
      pgError.message.includes('JSON')
    ) {
      const R = NextResponse.json({ error: 'Invalid message format in stored chat.', detail: pgError.message }, { status: 500 });
      return setCorsHeaders(R);
    }
    const Rerr = NextResponse.json({ error: message }, { status: 500 });
    return setCorsHeaders(Rerr);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  try {
    const { chat_id } = await params;

    if (!chat_id) {
      const R = NextResponse.json({ error: 'chat_id is required in the URL' }, { status: 400 });
      return setCorsHeaders(R);
    }

    // Authenticate the user
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.user) {
      const R = NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 });
      return setCorsHeaders(R);
    }

    const userId = authResult.user.id;

    // Fetch chat from DB - ensure it belongs to the user
    const chatQuery = 'SELECT messages FROM chats WHERE chat_id = $1 AND user_id = $2';
    const { rows, rowCount } = await db.query(chatQuery, [chat_id, userId]);

    if (rowCount === 0) {
      const R = NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
      return setCorsHeaders(R);
    }

    const chatMessagesFromDB: ChatMessage[] = rows[0].messages;

    if (!chatMessagesFromDB || chatMessagesFromDB.length === 0) {
      const R = NextResponse.json({ error: 'No messages in chat to summarize title from' }, { status: 400 });
      return setCorsHeaders(R);
    }

    // Prepare messages for LLM
    const messagesForSummary = chatMessagesFromDB.slice(0, 4);
    
    const llmMessages: LLMMessage[] = messagesForSummary.map((msg: ChatMessage) => {
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
        const R = NextResponse.json({ error: 'Not enough content after processing messages to summarize title.' }, { status: 400 });
        return setCorsHeaders(R);
    }
    
    const systemPromptText = "You are a witty headline writer. Craft a quirky, context-dependent title of 3-5 words that playfully captures this conversation's essence—use puns or playful language tied to key topics. Output only the title.";
    const systemPrompt: LLMMessage = {
      role: 'system',
      content: systemPromptText
    };

    const titleGenerationPayload: LLMMessage[] = [systemPrompt, ...llmMessages];

    const llmProvider: LLMProvider = 'deepseek';
    const llmConfig: LLMConfig = {
      stream: false, 
      max_tokens: 20, 
      temperature: 1,
    };
    

    let newTitleRaw: string | AsyncGenerator<string, void, unknown>;
    try {
        newTitleRaw = await generateChatCompletion(llmProvider, titleGenerationPayload, llmConfig);
    } catch (llmError: unknown) {
        let message = 'LLM service error during title generation.';
        if (llmError instanceof Error) message = llmError.message;
        const R = NextResponse.json({ error: message }, { status: 502 });
        return setCorsHeaders(R);
    }

    if (typeof newTitleRaw !== 'string' || !newTitleRaw.trim()) {
      newTitleRaw = "Chat Summary"; 
    }

    let newTitle = newTitleRaw.replace(/[\"\'*`~#\"\']/g, '').trim();
    const words = newTitle.split(/\s+/);
    if (words.length > 4) {
      newTitle = words.slice(0, 4).join(' ');
    } else if (words.length === 0 || newTitle.length === 0) {
      newTitle = "Chat Summary"; 
    }
    
    const updateQuery = `
      UPDATE chats
      SET title = $1, updated_at = CURRENT_TIMESTAMP
      WHERE chat_id = $2 AND user_id = $3
      RETURNING chat_id, title;
    `;
    const updateValues = [newTitle, chat_id, userId];
    const { rows: updatedRows, rowCount: updatedRowCount } = await db.query(updateQuery, updateValues);

    if (updatedRowCount === 0) {
      const R = NextResponse.json({ error: 'Chat not found or access denied during update' }, { status: 404 });
      return setCorsHeaders(R);
    }

    const Rfinal = NextResponse.json(
      {
        message: 'Chat title summarized and updated successfully',
        chat_id: updatedRows[0].chat_id,
        title: updatedRows[0].title,
      },
      { status: 200 }
    );
    return setCorsHeaders(Rfinal);

  } catch (error: unknown) {
    const resolvedParams = await params;
    let message = 'Error summarizing chat title.';
    if (error instanceof Error) message = error.message;
    type PgError = { code?: string; message?: string };
    const pgError = error as PgError;
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      pgError.code === '22P02' &&
      pgError.message &&
      pgError.message.includes('JSON')
    ) {
      const R = NextResponse.json({ error: 'Invalid message format in stored chat during title summarization.', detail: pgError.message }, { status: 500 });
      return setCorsHeaders(R);
    }
    const Rerr = NextResponse.json({ error: message }, { status: 500 });
    return setCorsHeaders(Rerr);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const { chat_id } = await params;
  try {
    // Authenticate the user
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.user) {
      const R = NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 });
      return setCorsHeaders(R);
    }

    const userId = authResult.user.id;

    // Delete chat only if it belongs to the user
    const query = 'DELETE FROM chats WHERE chat_id = $1 AND user_id = $2 RETURNING chat_id;';
    const { rowCount } = await db.query(query, [chat_id, userId]);

    if (rowCount === 0) {
      const R = NextResponse.json({ error: 'Chat not found or access denied' }, { status: 404 });
      return setCorsHeaders(R);
    }

    const Rfinal = NextResponse.json({ message: 'Chat deleted successfully' }, { status: 200 });
    return setCorsHeaders(Rfinal);
  } catch (error) {
    let message = 'Error deleting chat.';
    if (error instanceof Error) message = error.message;
    const R = NextResponse.json({ error: message }, { status: 500 });
    return setCorsHeaders(R);
  }
} 