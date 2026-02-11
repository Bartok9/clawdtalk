import { NextRequest, NextResponse } from 'next/server';
import { chatWithLLM } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider, model, messages, apiKey, customBaseUrl } = body;

  if (!provider || !model || !messages) {
    return NextResponse.json({ error: 'Missing required fields: provider, model, messages' }, { status: 400 });
  }

  const resolvedKey = apiKey || process.env[`${provider.toUpperCase()}_API_KEY`] || '';
  if (!resolvedKey) {
    return NextResponse.json({ error: `No API key for provider: ${provider}` }, { status: 400 });
  }

  try {
    const reply = await chatWithLLM({ provider, model, messages, apiKey: resolvedKey, customBaseUrl });
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
