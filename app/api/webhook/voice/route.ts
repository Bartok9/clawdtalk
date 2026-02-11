import { NextRequest, NextResponse } from 'next/server';
import { createConversation, addMessage, getConversations } from '@/lib/store';
import { chatWithLLM } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const event = body.data?.event_type;
  const callControlId = body.data?.payload?.call_control_id;
  const from = body.data?.payload?.from || 'unknown';
  const telnyxApiKey = process.env.TELNYX_API_KEY;

  if (!telnyxApiKey) {
    return NextResponse.json({ error: 'Telnyx not configured' }, { status: 500 });
  }

  const telnyxCmd = async (id: string, command: string, payload: Record<string, unknown> = {}) => {
    await fetch(`https://api.telnyx.com/v2/calls/${id}/actions/${command}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${telnyxApiKey}` },
      body: JSON.stringify(payload),
    });
  };

  switch (event) {
    case 'call.initiated':
      await telnyxCmd(callControlId, 'answer', { client_state: Buffer.from('{}').toString('base64') });
      break;

    case 'call.answered':
      // Start gathering speech
      await telnyxCmd(callControlId, 'gather_using_speak', {
        payload: 'Hello, how can I help you today?',
        voice: 'Telnyx.Libby',
        language: 'en-US',
        minimum_digits: 1,
        maximum_digits: 128,
        timeout_millis: 60000,
      });

      createConversation({
        id: callControlId,
        agentId: 'default',
        agentName: 'Voice Agent',
        channel: 'phone',
        from,
        messages: [{ id: crypto.randomUUID(), role: 'assistant', content: 'Hello, how can I help you today?', timestamp: new Date().toISOString() }],
        status: 'active',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      break;

    case 'call.gather.ended': {
      const speech = body.data?.payload?.digits || body.data?.payload?.speech?.result || '';
      if (speech) {
        addMessage(callControlId, {
          id: crypto.randomUUID(), role: 'user', content: speech, timestamp: new Date().toISOString(),
        });

        // Simple reply - in production, look up agent config
        try {
          const reply = await chatWithLLM({
            provider: 'anthropic', model: 'claude-sonnet-4-20250514',
            messages: [
              { role: 'system', content: 'You are a helpful phone agent. Keep responses brief and conversational.' },
              { role: 'user', content: speech },
            ],
            apiKey: process.env.ANTHROPIC_API_KEY || '',
          });

          addMessage(callControlId, {
            id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: new Date().toISOString(),
          });

          await telnyxCmd(callControlId, 'gather_using_speak', {
            payload: reply, voice: 'Telnyx.Libby', language: 'en-US',
            minimum_digits: 1, maximum_digits: 128, timeout_millis: 60000,
          });
        } catch {
          await telnyxCmd(callControlId, 'speak', {
            payload: 'I apologize, I encountered an error. Please try again.',
            voice: 'Telnyx.Libby', language: 'en-US',
          });
        }
      }
      break;
    }

    case 'call.hangup':
      // Find and end conversation
      const convs = getConversations();
      const conv = convs.find(c => c.id === callControlId);
      if (conv) conv.status = 'ended';
      break;
  }

  return NextResponse.json({ status: 'ok' });
}
