import { NextRequest, NextResponse } from 'next/server';
import { createConversation, addMessage, getConversations } from '@/lib/store';
import { chatWithLLM } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Voice webhook event:', JSON.stringify(body).substring(0, 500));
    
    const event = body.data?.event_type;
    const callControlId = body.data?.payload?.call_control_id;
    const from = body.data?.payload?.from || 'unknown';
    const telnyxApiKey = process.env.TELNYX_API_KEY;

    if (!telnyxApiKey) {
      console.error('TELNYX_API_KEY not set');
      return NextResponse.json({ error: 'Telnyx not configured' }, { status: 500 });
    }

    const telnyxCmd = async (id: string, command: string, payload: Record<string, unknown> = {}) => {
      console.log(`Telnyx command: ${command}`, JSON.stringify(payload).substring(0, 200));
      const res = await fetch(`https://api.telnyx.com/v2/calls/${id}/actions/${command}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${telnyxApiKey}` },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      console.log(`Telnyx response (${res.status}):`, text.substring(0, 300));
      return { status: res.status, body: text };
    };

    switch (event) {
      case 'call.initiated': {
        console.log('Call initiated, answering...');
        const direction = body.data?.payload?.direction;
        if (direction === 'incoming') {
          await telnyxCmd(callControlId, 'answer', {
            client_state: Buffer.from(JSON.stringify({ step: 'greeting' })).toString('base64'),
          });
        }
        break;
      }

      case 'call.answered': {
        console.log('Call answered, speaking greeting...');
        // Use speak first, then gather speech separately
        await telnyxCmd(callControlId, 'speak', {
          payload: 'Hello! Thanks for calling. How can I help you today?',
          voice: 'female',
          language: 'en-US',
          client_state: Buffer.from(JSON.stringify({ step: 'greeting_spoken' })).toString('base64'),
        });

        createConversation({
          id: callControlId,
          agentId: 'default',
          agentName: 'Voice Agent',
          channel: 'phone',
          from,
          messages: [{ id: crypto.randomUUID(), role: 'assistant', content: 'Hello! Thanks for calling. How can I help you today?', timestamp: new Date().toISOString() }],
          status: 'active',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        break;
      }

      case 'call.speak.ended': {
        console.log('Speak ended, starting speech gather...');
        // After speaking, start listening for speech
        await telnyxCmd(callControlId, 'gather', {
          input: 'speech',
          language: 'en-US',
          inter_digit_timeout: 5000,
          timeout_millis: 15000,
          minimum_digits: 1,
          maximum_digits: 128,
          client_state: Buffer.from(JSON.stringify({ step: 'listening' })).toString('base64'),
        });
        break;
      }

      case 'call.gather.ended': {
        const speech = body.data?.payload?.speech?.result || body.data?.payload?.digits || '';
        console.log('Gather ended, speech:', speech);
        
        if (speech) {
          addMessage(callControlId, {
            id: crypto.randomUUID(), role: 'user', content: speech, timestamp: new Date().toISOString(),
          });

          try {
            // Build conversation history
            const conv = getConversations().find(c => c.id === callControlId);
            const messages = conv ? conv.messages.map(m => ({ role: m.role, content: m.content })) : [];
            messages.push({ role: 'user', content: speech });

            const reply = await chatWithLLM({
              provider: 'anthropic', model: 'claude-sonnet-4-20250514',
              messages: [
                { role: 'system', content: 'You are a helpful phone agent for Assistable AI. Keep responses brief, conversational, and natural-sounding. Limit responses to 2-3 sentences.' },
                ...messages,
              ],
              apiKey: process.env.ANTHROPIC_API_KEY || '',
            });

            addMessage(callControlId, {
              id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: new Date().toISOString(),
            });

            // Speak the reply, then gather will restart via call.speak.ended
            await telnyxCmd(callControlId, 'speak', {
              payload: reply,
              voice: 'female',
              language: 'en-US',
              client_state: Buffer.from(JSON.stringify({ step: 'reply_spoken' })).toString('base64'),
            });
          } catch (err) {
            console.error('LLM error:', err);
            await telnyxCmd(callControlId, 'speak', {
              payload: 'I apologize, I encountered an error. Could you repeat that?',
              voice: 'female',
              language: 'en-US',
            });
          }
        } else {
          // No speech detected, ask again
          await telnyxCmd(callControlId, 'speak', {
            payload: "I didn't catch that. Could you say that again?",
            voice: 'female',
            language: 'en-US',
          });
        }
        break;
      }

      case 'call.hangup': {
        console.log('Call hung up');
        const convs = getConversations();
        const conv = convs.find(c => c.id === callControlId);
        if (conv) conv.status = 'ended';
        break;
      }

      default:
        console.log('Unhandled event:', event);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ status: 'ok' });
  }
}
