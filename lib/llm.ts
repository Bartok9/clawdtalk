import { LLMProvider } from './types';

interface ChatMessage {
  role: string;
  content: string;
}

interface LLMRequest {
  provider: LLMProvider;
  model: string;
  messages: ChatMessage[];
  apiKey: string;
  customBaseUrl?: string;
}

export async function chatWithLLM(req: LLMRequest): Promise<string> {
  const { provider, model, messages, apiKey, customBaseUrl } = req;

  switch (provider) {
    case 'openai':
    case 'openrouter':
    case 'custom': {
      const baseUrl = provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1'
        : provider === 'custom'
          ? (customBaseUrl || 'https://api.openai.com/v1')
          : 'https://api.openai.com/v1';
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages }),
      });
      if (!res.ok) throw new Error(`LLM error: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }

    case 'anthropic': {
      const systemMsg = messages.find(m => m.role === 'system');
      const userMessages = messages.filter(m => m.role !== 'system');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemMsg?.content || '',
          messages: userMessages,
        }),
      });
      if (!res.ok) throw new Error(`LLM error: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }

    case 'google': {
      const contents = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const systemMsg = messages.find(m => m.role === 'system');
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg.content }] } } : {}),
          }),
        }
      );
      if (!res.ok) throw new Error(`LLM error: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
