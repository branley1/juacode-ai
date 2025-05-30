import { NextRequest, NextResponse } from 'next/server';
import { LLMMessage, LLMProvider, generateChatCompletion, LLMConfig } from '@/lib/llmService';
import { authenticateRequest } from '@/lib/auth';

// Helper to map selected_model string to LLMProvider type
function mapToLLMProvider(selectedModel?: string): LLMProvider {
  const defaultProvider: LLMProvider = 'gemini'; // Or your preferred default
  if (!selectedModel) return defaultProvider;

  const lowerModel = selectedModel.toLowerCase();
  if (lowerModel.includes('gpt') || lowerModel.includes('openai') || lowerModel.includes('o4')) return 'openai';
  if (lowerModel.includes('deepseek')) return 'deepseek';
  if (lowerModel.includes('gemini')) return 'gemini';
  
  return defaultProvider;
}

export async function POST(req: NextRequest) {
  console.log('POST /api/generate: request received');
  // Authenticate request
  const authResult = await authenticateRequest(req);
  console.log('Authentication result for /api/generate:', authResult.success, authResult.user?.id);
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log('POST /api/generate: request body:', body);
    const messages: LLMMessage[] = body.messages || [];
    const model_variant: string = body.model_variant || 'normal';
    const selected_model_str: string | undefined = body.selected_model;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const llmProvider = mapToLLMProvider(selected_model_str);
    console.log('Mapped llmProvider for /api/generate:', llmProvider);
    
    let specificModelName: string | undefined;
    if (llmProvider === 'openai') {
      specificModelName = process.env.OPENAI_MODEL || 'o4-mini-2025-04-16';
    } else if (llmProvider === 'deepseek') {
      specificModelName = model_variant === 'reasoner' ? 'deepseek-reasoner' : 'deepseek-chat';
    } else if (llmProvider === 'gemini') {
      specificModelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro-preview-05-06';
    }
    console.log('Using specificModelName:', specificModelName);

    let llmMessages = [...messages];
    if (model_variant === 'reasoner' && llmProvider !== 'deepseek') {
      llmMessages = [
        { role: 'system', content: 'Think step-by-step. Use <think></think> tags for your thoughts.' },
        ...messages,
      ];
    }
    console.log('LLM messages count:', llmMessages.length);

    const llmConfig: LLMConfig = {
      stream: true,
      model: specificModelName,
    };
    console.log('LLM configuration for /api/generate:', llmConfig);

    const llmStream = await generateChatCompletion(
      llmProvider,
      llmMessages,
      llmConfig
    );
    console.log('generateChatCompletion returned llmStream of type:', typeof llmStream);

    if (typeof llmStream === 'string') {
      console.log('LLM returned non-stream string response:', llmStream);
      return NextResponse.json({ response: llmStream });
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send the model name as the first event
          if (specificModelName) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model_used: specificModelName })}\n\n`));
          }

          for await (const chunk of llmStream) {
            console.log('Streaming chunk:', chunk);
            if (chunk) { // Ensure chunk is not empty or undefined
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            }
          }
          // Signal the end of the stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('Error streaming LLM response:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    console.error('Error in POST /api/generate handler:', error);
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to generate response', details: errorMessage }, { status: 500 });
  }
} 