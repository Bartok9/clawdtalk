export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'custom';

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  voice: string;
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  knowledgeBase: string;
  channels: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  channel: 'voice' | 'phone' | 'sms' | 'chat';
  from: string;
  messages: Message[];
  status: 'active' | 'ended';
  startedAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  type: 'phone' | 'sms' | 'voice-orb' | 'live-chat';
  name: string;
  config: Record<string, string>;
  agentId?: string;
  createdAt: string;
}

export interface Settings {
  telnyxApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
  openrouterApiKey: string;
  webhookUrl: string;
  whiteLabel: {
    logo: string;
    primaryColor: string;
    accentColor: string;
    domain: string;
    companyName: string;
  };
}

export const MODEL_LIST: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4', 'claude-sonnet-4', 'claude-3.5-haiku'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  openrouter: [],
  custom: [],
};

export const TELNYX_VOICES = [
  'Telnyx.Libby', 'Telnyx.Rebecca', 'Telnyx.Bill', 'Telnyx.George',
  'Telnyx.Julia', 'Telnyx.Karl', 'Telnyx.Chloe', 'Telnyx.Marcus',
];
