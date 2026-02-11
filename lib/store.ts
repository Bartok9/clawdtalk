import { Conversation, Message } from './types';

// Server-side in-memory conversation store
const conversations: Conversation[] = [];

export function getConversations(): Conversation[] {
  return conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getConversation(id: string): Conversation | undefined {
  return conversations.find(c => c.id === id);
}

export function createConversation(conv: Conversation): Conversation {
  conversations.push(conv);
  return conv;
}

export function addMessage(conversationId: string, message: Message): Conversation | undefined {
  const conv = conversations.find(c => c.id === conversationId);
  if (conv) {
    conv.messages.push(message);
    conv.updatedAt = new Date().toISOString();
  }
  return conv;
}

export function endConversation(id: string): void {
  const conv = conversations.find(c => c.id === id);
  if (conv) conv.status = 'ended';
}
