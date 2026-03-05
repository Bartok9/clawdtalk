# ClawdTalk

Multi-channel AI agent platform with real-time voice powered by OpenAI Realtime API.

## Features

- 📞 **Voice Calls** - Natural, low-latency conversations with OpenAI Realtime
- 💬 **SMS** - AI-powered text messaging
- 🎙️ **Real-time Streaming** - Bidirectional audio via Telnyx WebSocket
- 🔊 **Server-side VAD** - Intelligent turn detection

## Architecture

```
Phone Call → Telnyx → WebSocket Media Stream → OpenAI Realtime API
                ↓                                    ↓
           PCMU Audio ←←←←←←←←←←←←←←←←←←←←←←← AI Response
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required keys:
- `TELNYX_API_KEY` - From [Telnyx Portal](https://portal.telnyx.com)
- `OPENAI_API_KEY` - From [OpenAI](https://platform.openai.com)

### 3. Start the server

```bash
npm run dev
```

### 4. Expose with ngrok

```bash
ngrok http 3000
```

### 5. Configure Telnyx

1. Go to **Voice → TeXML Applications** in Telnyx Portal
2. Create a new application
3. Set webhook URL: `https://your-ngrok-url.ngrok.app/api/webhook/voice`
4. Assign your phone number

## Voice Configuration

Available voices (set via `OPENAI_VOICE`):
- `alloy` (default)
- `echo`
- `shimmer`
- `ash`
- `ballad`
- `coral`
- `sage`
- `verse`

## Development

```bash
# Run with hot reload (Next.js only, no WebSocket)
npm run dev:next

# Run with WebSocket support
npm run dev

# Production build
npm run build
npm start
```

## How It Works

1. **Incoming Call**: Telnyx sends webhook to `/api/webhook/voice`
2. **Answer**: Server answers with streaming configuration
3. **Media Stream**: Telnyx opens WebSocket to `/media-stream`
4. **Audio Bridge**: Server connects to OpenAI Realtime API
5. **Real-time Conversation**: Audio flows bidirectionally with sub-second latency

## License

MIT
