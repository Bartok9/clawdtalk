/**
 * OpenAI Realtime Bridge for ClawdTalk
 * 
 * Bridges Telnyx WebSocket media streaming ↔ OpenAI Realtime API
 * for natural, low-latency voice conversations.
 */

import WebSocket from 'ws';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

interface BridgeConfig {
  openaiApiKey: string;
  voice?: string;
  systemPrompt?: string;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: Error) => void;
}

interface TelnyxMediaEvent {
  event: string;
  stream_id?: string;
  sequence_number?: string;
  media?: {
    track?: string;
    chunk?: string;
    timestamp?: string;
    payload?: string;
  };
  start?: {
    call_control_id?: string;
    from?: string;
    to?: string;
    media_format?: {
      encoding?: string;
      sample_rate?: number;
      channels?: number;
    };
  };
}

export class OpenAIRealtimeBridge {
  private openaiWs: WebSocket | null = null;
  private config: BridgeConfig;
  private streamId: string | null = null;
  private isConnected = false;

  constructor(config: BridgeConfig) {
    this.config = {
      voice: 'alloy',
      systemPrompt: `You are a helpful AI voice assistant. Keep responses brief and conversational.
- Speak naturally, as if on a phone call
- Limit responses to 2-3 sentences unless asked for more detail
- Don't use markdown, bullets, or formatting
- Say numbers naturally (e.g., "fifteen hundred" not "1,500")
- You have access to the caller's context and tools when needed`,
      ...config,
    };
  }

  /**
   * Connect to OpenAI Realtime API
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
        headers: {
          Authorization: `Bearer ${this.config.openaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      this.openaiWs.on('open', () => {
        console.log('[OpenAI] Connected to Realtime API');
        this.isConnected = true;
        
        // Configure session
        setTimeout(() => {
          this.sendSessionUpdate();
          resolve();
        }, 100);
      });

      this.openaiWs.on('error', (error) => {
        console.error('[OpenAI] WebSocket error:', error);
        this.config.onError?.(error as Error);
        reject(error);
      });

      this.openaiWs.on('close', () => {
        console.log('[OpenAI] Disconnected from Realtime API');
        this.isConnected = false;
      });
    });
  }

  /**
   * Send session configuration to OpenAI
   */
  private sendSessionUpdate(): void {
    if (!this.openaiWs || this.openaiWs.readyState !== WebSocket.OPEN) return;

    const sessionUpdate = {
      type: 'session.update',
      session: {
        turn_detection: { type: 'server_vad' },
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        voice: this.config.voice,
        instructions: this.config.systemPrompt,
        modalities: ['text', 'audio'],
        temperature: 0.8,
      },
    };

    console.log('[OpenAI] Sending session update');
    this.openaiWs.send(JSON.stringify(sessionUpdate));
  }

  /**
   * Handle incoming Telnyx media event
   */
  handleTelnyxEvent(event: TelnyxMediaEvent): string | null {
    switch (event.event) {
      case 'start':
        this.streamId = event.stream_id || null;
        console.log('[Telnyx] Stream started:', this.streamId);
        break;

      case 'media':
        if (event.media?.payload && this.isConnected && this.openaiWs?.readyState === WebSocket.OPEN) {
          // Forward audio to OpenAI
          this.openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: event.media.payload,
          }));
        }
        break;

      case 'stop':
        console.log('[Telnyx] Stream stopped');
        this.close();
        break;

      default:
        console.log('[Telnyx] Event:', event.event);
    }

    return null;
  }

  /**
   * Set up handler for OpenAI responses to send back to Telnyx
   */
  onAudioResponse(callback: (audioBase64: string) => void): void {
    if (!this.openaiWs) return;

    this.openaiWs.on('message', (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());

        // Log important events
        if (['session.created', 'session.updated', 'response.done', 
             'input_audio_buffer.speech_started', 'input_audio_buffer.speech_stopped'].includes(response.type)) {
          console.log('[OpenAI] Event:', response.type);
        }

        // Forward audio deltas to Telnyx
        if (response.type === 'response.audio.delta' && response.delta) {
          callback(response.delta);
        }

        // Handle transcripts for logging
        if (response.type === 'conversation.item.input_audio_transcription.completed') {
          this.config.onTranscript?.(response.transcript || '', 'user');
        }

        if (response.type === 'response.audio_transcript.done') {
          this.config.onTranscript?.(response.transcript || '', 'assistant');
        }

      } catch (error) {
        console.error('[OpenAI] Error parsing message:', error);
      }
    });
  }

  /**
   * Interrupt current response (for barge-in)
   */
  interrupt(): void {
    if (!this.openaiWs || this.openaiWs.readyState !== WebSocket.OPEN) return;

    // Clear OpenAI's response
    this.openaiWs.send(JSON.stringify({
      type: 'response.cancel',
    }));
  }

  /**
   * Close the bridge
   */
  close(): void {
    if (this.openaiWs) {
      if (this.openaiWs.readyState === WebSocket.OPEN) {
        this.openaiWs.close();
      }
      this.openaiWs = null;
    }
    this.isConnected = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export default OpenAIRealtimeBridge;
