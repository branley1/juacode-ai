import { OpenAI } from 'openai/index.mjs';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'model'; // 'model' is used by Gemini for assistant messages
  content: string;
}

export interface LLMConfig {
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  model?: string;
}

export type LLMProvider = 'openai' | 'deepseek' | 'gemini';

// Environment Variable Checks & Client Initialization
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

let openaiClient: OpenAI | undefined;
if (OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.warn('OpenAI API key not found. OpenAI provider will be unavailable.');
}

let googleAIClient: GoogleGenerativeAI | undefined;
if (GEMINI_API_KEY) {
  googleAIClient = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn('Gemini API key not found. Gemini provider will be unavailable.');
}

let deepseekOpenAIClient: OpenAI | undefined;
if (DEEPSEEK_API_KEY) {
  deepseekOpenAIClient = new OpenAI({
    apiKey: DEEPSEEK_API_KEY,
    baseURL: DEEPSEEK_BASE_URL,
  });
} else {
  console.warn('DeepSeek API key not found. DeepSeek provider may be unavailable or use a different auth method.');
}

/* Helper for Streaming HTTP Responses
async function* streamSSE(response: Response): AsyncGenerator<unknown, void, unknown> {
  if (!response.body) {
    throw new Error('Response body is null');
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) {
        // Process any remaining data in the buffer if it's a complete JSON object
        try {
          yield JSON.parse(buffer.trim());
        } catch (e) {
          console.error('Error parsing remaining JSON from stream:', e, 'Buffer:', buffer);
        }
      }
      break;
    }

    buffer += value;
    let eventEndIndex;
    while ((eventEndIndex = buffer.indexOf('\n\n')) !== -1) {
      const eventStr = buffer.substring(0, eventEndIndex);
      buffer = buffer.substring(eventEndIndex + 2);

      if (eventStr.startsWith('data: ')) {
        const jsonStr = eventStr.substring(6).trim();
        if (jsonStr === '[DONE]') {
          return;
        }
        try {
          yield JSON.parse(jsonStr);
        } catch (e) {
          console.error('Error parsing JSON from stream:', e, 'JSON String:', jsonStr);
        }
      }
    }
  }
}
*/

// DeepSeek Implementation
async function generateDeepSeekCompletion(
  messages: LLMMessage[], 
  config: LLMConfig = {}
): Promise<AsyncGenerator<string, void, unknown> | string> {
  if (!deepseekOpenAIClient) {
    throw new Error('DeepSeek client (OpenAI SDK) not initialized. API key might be missing.');
  }

  const { 
    stream = true, 
    // max_tokens = 2000, 
    temperature = 0.7, 
    model = 'deepseek-chat'
  } = config;

  const apiMessages = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : m.role,
    content: m.content
  })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

  try {
    if (stream) {
      const responseStream = await deepseekOpenAIClient.chat.completions.create({
        model: model,
        messages: apiMessages,
        max_tokens: (model === 'deepseek-reasoner') ? config.max_tokens || 8000 : config.max_tokens || 4096, 
        temperature: (model === 'deepseek-reasoner') ? undefined : temperature, 
        stream: true,
      });

      async function* contentStream(): AsyncGenerator<string, void, unknown> {
        let thinkTagOpen = false;
        for await (const chunk of responseStream) {
          let yieldBuffer = '';
          const delta = chunk.choices[0]?.delta as Record<string, unknown>; // Cast to a more specific type

          if (delta) {
            if (delta.reasoning_content) {
              if (!thinkTagOpen) {
                yieldBuffer += '<think>';
                thinkTagOpen = true;
              }
              yieldBuffer += delta.reasoning_content;
            }
            if (delta.content) {
              if (thinkTagOpen) {
                yieldBuffer += '</think>';
                thinkTagOpen = false;
              }
              yieldBuffer += delta.content;
            }
          }
          if (yieldBuffer) {
            yield yieldBuffer;
          }
        }
        if (thinkTagOpen) { 
          yield '</think>';
        }
      }
      return contentStream();
    } else { // Non-streaming
      const response = await deepseekOpenAIClient.chat.completions.create({
        model: model,
        messages: apiMessages,
        max_tokens: (model === 'deepseek-reasoner') ? config.max_tokens || 8000 : config.max_tokens || 4096,
        temperature: (model === 'deepseek-reasoner') ? undefined : temperature,
        stream: false,
      });

      const message = response.choices[0]?.message;
      let fullContent = '';
      if (message) {
        if ('reasoning_content' in message && typeof message.reasoning_content === 'string') {
          fullContent += `<think>${message.reasoning_content}</think>`;
        }
        if ('content' in message && typeof message.content === 'string') {
          fullContent += (fullContent ? '\n\n' : '') + message.content.trim();
        }
      }
      return fullContent;
    }
  } catch (error: unknown) {
    console.error('DeepSeek API Error (via OpenAI SDK):', error);
    type PgError = { message?: string };
    const pgError = error as PgError;
    throw new Error(pgError.message || 'DeepSeek API request failed.');
  }
}

// Placeholder for OpenAI and Gemini implementations
async function generateOpenAICompletion(
  messages: LLMMessage[], 
  config: LLMConfig = {}
): Promise<AsyncGenerator<string, void, unknown> | string> {
  if (!openaiClient) {
    throw new Error('OpenAI API key not found or client not initialized. OpenAI provider will be unavailable.');
  }

  const { 
    stream = true, 
    temperature = process.env.OPENAI_TEMPERATURE ? parseFloat(process.env.OPENAI_TEMPERATURE) : 0.7, 
    model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo' // Fallback model (o4-mini-2025-04-16)
  } = config;
  const maxTokens = config.max_tokens || (process.env.OPENAI_MAX_TOKENS ? parseInt(process.env.OPENAI_MAX_TOKENS) : 2000);

  // Filter out system messages if the model doesn't support them directly in the main list, or handle as per API docs
  // OpenAI generally supports system messages as the first message.
  const openAIMessages = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : m.role, // Ensure role is compatible
    content: m.content
  })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

  try {
    if (stream) {
      const responseStream = await openaiClient.chat.completions.create({
        model: model,
        messages: openAIMessages,
        temperature: temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      async function* contentStream(): AsyncGenerator<string, void, unknown> {
        for await (const chunk of responseStream) {
          if (chunk.choices && chunk.choices[0]?.delta?.content) {
            yield chunk.choices[0].delta.content;
          }
        }
      }
      return contentStream();
    } else {
      const response = await openaiClient.chat.completions.create({
        model: model,
        messages: openAIMessages,
        temperature: temperature,
        max_tokens: maxTokens,
        stream: false,
      });
      return response.choices[0]?.message?.content?.trim() || '';
    }
  } catch (error: unknown) {
    console.error('OpenAI API Error:', error);
    type PgError = { message?: string };
    const pgError = error as PgError;
    throw new Error(`OpenAI API request failed: ${pgError.message}`);
  }
}

async function generateGeminiCompletion(
  messages: LLMMessage[], 
  config: LLMConfig = {}
): Promise<AsyncGenerator<string, void, unknown> | string> {
  if (!googleAIClient) {
    throw new Error('Gemini API key not found or client not initialized. Gemini provider will be unavailable.');
  }

  const { 
    stream = true, 
    max_tokens = 2048, 
    temperature = 0.7, 
    model = process.env.GEMINI_MODEL || 'gemini-2.5-pro-preview-05-06'
  } = config;

  let systemInstructionContent: string | undefined = undefined;
  const geminiMessages = messages
    .filter(msg => {
      if (msg.role === 'system') {
        systemInstructionContent = msg.content;
        return false; 
      }
      return true;
    })
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role, 
      parts: [{ text: m.content }],
    }));

  if (geminiMessages.length === 0 && systemInstructionContent) {
      geminiMessages.push({role: 'user', parts: [{text: "Follow the instructions."}]});
  }
    
  const generativeModel = googleAIClient.getGenerativeModel({
     model: model, 
     systemInstruction: systemInstructionContent ? { role: "system", parts: [{text: systemInstructionContent}]} : undefined
    });

  const generationConfig = {
    candidateCount: 1,
    maxOutputTokens: max_tokens,
    temperature: temperature,
  };

  // Define safety settings to match Python SDK example (adjust as needed)
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  try {
    if (stream) {
      // The result of generateContentStream is an AsyncIterable<GenerateContentResponse>
      const streamResult = await generativeModel.generateContentStream({ contents: geminiMessages, generationConfig, safetySettings });
      
      async function* contentStream(): AsyncGenerator<string, void, unknown> {
        for await (const chunk of streamResult.stream) { // Iterate over streamResult.stream
          // Ensure chunk and response exist, and text() is a function
          if (chunk && chunk.candidates && chunk.candidates.length > 0) {
            const candidate = chunk.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
              const text = candidate.content.parts.map(part => part.text).join('');
              if (text) {
                yield text;
              }
            }
          }
        }
      }
      return contentStream();
    } else {
      const result = await generativeModel.generateContent({ contents: geminiMessages, generationConfig, safetySettings });
      const response = result.response;
      if (response && response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
          console.warn(`Gemini non-stream: Candidate finished with reason: ${candidate.finishReason}`);
          if (response.promptFeedback) {
            console.warn(`Gemini non-stream: Prompt Feedback: ${JSON.stringify(response.promptFeedback)}`);
          }
          return ''; 
        }
        // Consolidate parts for non-streaming response as well
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          return candidate.content.parts.map(part => part.text).join('').trim();
        }
        return ''; // Return empty if no parts even with normal finish
      } else {
        console.warn("Gemini non-stream: No candidates or response text found", response);
        if (response?.promptFeedback) {
            console.warn(`Gemini non-stream: Prompt Feedback: ${JSON.stringify(response.promptFeedback)}`);
        }
        return '';
      }
    }
  } catch (error: unknown) {
    console.error('Gemini API Error:', error);
    type PgError = { message?: string };
    const pgError = error as PgError;
    throw new Error(`Gemini API request failed: ${pgError.message}`);
  }
}


// Main Dispatcher Function
export async function generateChatCompletion(
  provider: LLMProvider,
  messages: LLMMessage[],
  config: LLMConfig = {}
): Promise<AsyncGenerator<string, void, unknown> | string> {
  switch (provider) {
    case 'deepseek':
      return generateDeepSeekCompletion(messages, config);
    case 'openai':
      return generateOpenAICompletion(messages, config);
    case 'gemini':
      return generateGeminiCompletion(messages, config);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

// Testing
async function testLLM() {
  try {
    const messages: LLMMessage[] = [{ role: 'user', content: 'Hello, DeepSeek! Tell me a joke about AI with reasoning.' }];
    
    // Test DeepSeek Streaming (with reasoner model if applicable)
    console.log('\n Testing DeepSeek (Streaming)');
    const dsStream = await generateChatCompletion('deepseek', messages, { stream: true, model: 'deepseek-chat' }); // or deepseek-reasoner
    if (typeof dsStream !== 'string') {
      for await (const chunk of dsStream) {
        process.stdout.write(chunk);
      }
      console.log('\n');
    }

    // Test DeepSeek Non-Streaming
    console.log('\n Testing DeepSeek (Non-Streaming)');
    const dsResponse = await generateChatCompletion('deepseek', messages, { stream: false, model: 'deepseek-chat' });
    console.log(dsResponse);

  } catch (error) {
    console.error('LLM Test Error:', error);
  }
}

// testLLM();
