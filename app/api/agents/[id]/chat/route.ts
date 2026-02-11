import { NextRequest, NextResponse } from 'next/server';
import { addMessage, createConversation, getConversation } from '@/lib/store';
import { chatWithLLM } from '@/lib/llm';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: agentId } = params;
  const body = await req.json();
  const { message, conversationId, role, agentConfig } = body;

  let conv = conversationId ? getConversation(conversationId) : null;

  if (!conv) {
    conv = createConversation({
      id: conversationId || crypto.randomUUID(),
      agentId,
      agentName: agentConfig?.name || 'Agent',
      channel: 'chat',
      from: body.from || 'web-user',
      messages: [],
      status: 'active',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Add user/intervene message
  addMessage(conv.id, {
    id: crypto.randomUUID(),
    role: role || 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

  // If this is an intervention (role=assistant), skip LLM
  if (role === 'assistant') {
    return NextResponse.json({ conversationId: conv.id, message });
  }

  // Call LLM if config provided
  if (agentConfig) {
    try {
      const messages = [
        ...(agentConfig.systemPrompt ? [{ role: 'system', content: agentConfig.systemPrompt }] : []),
        ...(agentConfig.knowledgeBase ? [{ role: 'system', content: `Knowledge base:\n${agentConfig.knowledgeBase}` }] : []),
        ...conv.messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      ];

      const reply = await chatWithLLM({
        provider: agentConfig.provider,
        model: agentConfig.model,
        messages,
        apiKey: agentConfig.apiKey || process.env[`${agentConfig.provider.toUpperCase()}_API_KEY`] || '',
        customBaseUrl: agentConfig.customBaseUrl,
      });

      addMessage(conv.id, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ conversationId: conv.id, reply });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'LLM error';
      return NextResponse.json({ conversationId: conv.id, error: errorMsg }, { status: 500 });
    }
  }

  return NextResponse.json({ conversationId: conv.id, message: 'Message recorded' });
}
