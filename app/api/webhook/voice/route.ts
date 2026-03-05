import { NextRequest, NextResponse } from 'next/server';
import { createConversation, getConversations } from '@/lib/store';

/**
 * Voice Webhook Handler for ClawdTalk
 * 
 * Uses TeXML <Stream> for real-time OpenAI Realtime integration
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.data?.event_type;
    const callControlId = body.data?.payload?.call_control_id;
    const from = body.data?.payload?.from || 'unknown';
    const to = body.data?.payload?.to || 'unknown';
    const direction = body.data?.payload?.direction;

    console.log(`[Voice] Event: ${event} | From: ${from} | Direction: ${direction}`);

    const telnyxApiKey = process.env.TELNYX_API_KEY;
    if (!telnyxApiKey) {
      console.error('[Voice] TELNYX_API_KEY not set');
      return NextResponse.json({ error: 'Telnyx not configured' }, { status: 500 });
    }

    const telnyxCmd = async (id: string, command: string, payload: Record<string, unknown> = {}) => {
      console.log(`[Telnyx] Command: ${command}`);
      const res = await fetch(`https://api.telnyx.com/v2/calls/${id}/actions/${command}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${telnyxApiKey}` 
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`[Telnyx] Error ${res.status}: ${text}`);
      }
      return { status: res.status, body: text };
    };

    switch (event) {
      case 'call.initiated': {
        console.log('[Voice] Call initiated');
        if (direction === 'incoming') {
          // Answer with streaming enabled
          await telnyxCmd(callControlId, 'answer', {
            stream_url: `wss://${req.headers.get('host')}/media-stream`,
            stream_track: 'both_tracks',
            stream_bidirectional_mode: 'rtp',
            stream_bidirectional_codec: 'PCMU',
            client_state: Buffer.from(JSON.stringify({ step: 'streaming' })).toString('base64'),
          });
        }
        break;
      }

      case 'call.answered': {
        console.log('[Voice] Call answered - OpenAI Realtime streaming active');
        
        // Create conversation record
        createConversation({
          id: callControlId,
          agentId: 'openai-realtime',
          agentName: 'Voice Agent (OpenAI Realtime)',
          channel: 'phone',
          from,
          messages: [],
          status: 'active',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        break;
      }

      case 'streaming.started': {
        console.log('[Voice] Media streaming started');
        break;
      }

      case 'streaming.stopped': {
        console.log('[Voice] Media streaming stopped');
        break;
      }

      case 'call.hangup': {
        console.log('[Voice] Call ended');
        const convs = getConversations();
        const conv = convs.find(c => c.id === callControlId);
        if (conv) {
          conv.status = 'ended';
          conv.updatedAt = new Date().toISOString();
        }
        break;
      }

      default:
        if (event) {
          console.log(`[Voice] Unhandled event: ${event}`);
        }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('[Voice] Webhook error:', err);
    return NextResponse.json({ status: 'ok' });
  }
}

/**
 * TeXML handler for incoming calls
 * Returns TeXML response to start streaming
 */
export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000';
  
  // TeXML response with streaming
  const texmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please wait while we connect you to the AI assistant.</Say>
  <Pause length="1"/>
  <Connect>
    <Stream url="wss://${host}/media-stream" bidirectionalMode="rtp" codec="PCMU" />
  </Connect>
</Response>`;

  return new NextResponse(texmlResponse, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
