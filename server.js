/**
 * ClawdTalk Custom Server
 * 
 * Provides Next.js + WebSocket support for OpenAI Realtime integration
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// OpenAI Realtime configuration
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are a helpful AI voice assistant for ClawdTalk.

VOICE RULES:
- Keep responses SHORT (1-3 sentences). This is a phone call.
- Speak naturally. NO markdown, NO bullet points, NO asterisks.
- Be direct and conversational.
- Numbers: say naturally ("fifteen hundred" not "1,500").
- Don't repeat back what the caller said.

You are friendly, helpful, and efficient. Get to the point quickly.`;

const VOICE = process.env.OPENAI_VOICE || 'alloy';

// Track active calls
const activeCalls = new Map();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // WebSocket server for media streaming
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url, true);

    if (pathname === '/media-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Handle WebSocket connections from Telnyx
  wss.on('connection', (telnyxWs, request) => {
    console.log('[ClawdTalk] New media stream connection');
    
    let openaiWs = null;
    let streamId = null;
    let callControlId = null;

    // Connect to OpenAI Realtime
    const connectToOpenAI = () => {
      if (!OPENAI_API_KEY) {
        console.error('[ClawdTalk] OPENAI_API_KEY not set!');
        return;
      }

      openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      openaiWs.on('open', () => {
        console.log('[OpenAI] Connected to Realtime API');
        
        // Configure session after connection
        setTimeout(() => {
          const sessionUpdate = {
            type: 'session.update',
            session: {
              turn_detection: { type: 'server_vad' },
              input_audio_format: 'g711_ulaw',
              output_audio_format: 'g711_ulaw',
              voice: VOICE,
              instructions: SYSTEM_PROMPT,
              modalities: ['text', 'audio'],
              temperature: 0.8,
            },
          };
          openaiWs.send(JSON.stringify(sessionUpdate));
          console.log('[OpenAI] Session configured');
        }, 100);
      });

      openaiWs.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());

          // Log significant events
          const logEvents = [
            'session.created', 'session.updated', 'response.done',
            'input_audio_buffer.speech_started', 'input_audio_buffer.speech_stopped',
            'error'
          ];
          
          if (logEvents.includes(response.type)) {
            console.log(`[OpenAI] ${response.type}`, response.type === 'error' ? response.error : '');
          }

          // Forward audio to Telnyx
          if (response.type === 'response.audio.delta' && response.delta) {
            if (telnyxWs.readyState === WebSocket.OPEN) {
              telnyxWs.send(JSON.stringify({
                event: 'media',
                media: {
                  payload: response.delta,
                },
              }));
            }
          }

          // Log transcripts
          if (response.type === 'conversation.item.input_audio_transcription.completed') {
            console.log(`[Transcript] User: ${response.transcript}`);
          }
          if (response.type === 'response.audio_transcript.done') {
            console.log(`[Transcript] AI: ${response.transcript}`);
          }

        } catch (error) {
          console.error('[OpenAI] Parse error:', error);
        }
      });

      openaiWs.on('error', (error) => {
        console.error('[OpenAI] WebSocket error:', error.message);
      });

      openaiWs.on('close', () => {
        console.log('[OpenAI] Disconnected');
      });
    };

    // Handle messages from Telnyx
    telnyxWs.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.event) {
          case 'connected':
            console.log('[Telnyx] WebSocket connected');
            break;

          case 'start':
            streamId = data.stream_id;
            callControlId = data.start?.call_control_id;
            console.log(`[Telnyx] Stream started: ${streamId}`);
            console.log(`[Telnyx] From: ${data.start?.from} To: ${data.start?.to}`);
            console.log(`[Telnyx] Format: ${JSON.stringify(data.start?.media_format)}`);
            
            // Connect to OpenAI when stream starts
            connectToOpenAI();
            
            // Track active call
            if (callControlId) {
              activeCalls.set(callControlId, {
                streamId,
                startTime: Date.now(),
                from: data.start?.from,
                to: data.start?.to,
              });
            }
            break;

          case 'media':
            // Forward audio to OpenAI
            if (openaiWs && openaiWs.readyState === WebSocket.OPEN && data.media?.payload) {
              openaiWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: data.media.payload,
              }));
            }
            break;

          case 'stop':
            console.log('[Telnyx] Stream stopped');
            if (callControlId) {
              activeCalls.delete(callControlId);
            }
            break;

          case 'dtmf':
            console.log(`[Telnyx] DTMF: ${data.dtmf?.digit}`);
            break;

          default:
            console.log(`[Telnyx] Event: ${data.event}`);
        }
      } catch (error) {
        console.error('[Telnyx] Parse error:', error);
      }
    });

    telnyxWs.on('close', () => {
      console.log('[Telnyx] Client disconnected');
      if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close();
      }
      if (callControlId) {
        activeCalls.delete(callControlId);
      }
    });

    telnyxWs.on('error', (error) => {
      console.error('[Telnyx] WebSocket error:', error.message);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> ClawdTalk ready on http://${hostname}:${port}`);
    console.log(`> OpenAI Realtime voice enabled: ${OPENAI_API_KEY ? 'YES' : 'NO (missing API key)'}`);
    console.log(`> Voice: ${VOICE}`);
  });
});
