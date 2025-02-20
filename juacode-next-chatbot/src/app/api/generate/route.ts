// Chat generation API
// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});

async function generateChatResponse(prompt: string, model: string = 'deepseek-chat') {
  const messages = [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: prompt },
  ];

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    });
    const message = response.choices[0].message?.content;
    if (!message) throw new Error('Empty response from OpenAI');
    return { response: message };
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { prompt, model_variant } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }
    let result;
    if (model_variant === 'reasoner') {
      result = await generateChatResponse(prompt, 'deepseek-reasoner');
    } else {
      result = await generateChatResponse(prompt);
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Error generating response: ${error.message}` },
      { status: 500 }
    );
  }
}
