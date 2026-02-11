import { NextRequest, NextResponse } from 'next/server';
import { createConversation, addMessage, getConversations } from '@/lib/store';
import { chatWithLLM } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const event = body.data?.event_type;

  if (event !== 'message.received') {
    return NextResponse.json({ status: 'ignored' });
  }

  const from = body.data?.payload?.from?.phone_number || 'unknown';
  const to = body.data?.payload?.to?.[0]?.phone_number || '';
  const text = body.data?.payload?.text || '';
  const telnyxApiKey = process.env.TELNYX_API_KEY;

  if (!text || !telnyxApiKey) {
    return NextResponse.json({ status: 'ok' });
  }

  // Find or create conversation for this phone number
  let conv = getConversations().find(c => c.channel === 'sms' && c.from === from && c.status === 'active');
  if (!conv) {
    conv = createConversation({
      id: crypto.randomUUID(),
      agentId: 'default',
      agentName: 'SMS Agent',
      channel: 'sms',
      from,
      messages: [],
      status: 'active',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  addMessage(conv.id, {
    id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date().toISOString(),
  });

  // Generate reply
  try {
    const reply = await chatWithLLM({
      provider: 'openrouter', model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful SMS agent. Keep responses brief (under 160 chars when possible).' },
        ...conv.messages.map(m => ({ role: m.role, content: m.content })),
      ],
      apiKey: process.env.OPENROUTER_API_KEY || '',
    });

    addMessage(conv.id, {
      id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: new Date().toISOString(),
    });

    // Send SMS reply via Telnyx
    await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${telnyxApiKey}` },
      body: JSON.stringify({ from: to, to: from, text: reply }),
    });
  } catch (err) {
    console.error('SMS reply error:', err);
  }

  return NextResponse.json({ status: 'ok' });
}
