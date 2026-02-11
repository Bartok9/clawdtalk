'use client';

import { useEffect, useState } from 'react';
import { Conversation } from '@/lib/types';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [interveneMsg, setInterveneMsg] = useState('');

  useEffect(() => {
    const load = () => fetch('/api/conversations').then(r => r.json()).then(setConversations).catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleIntervene = async () => {
    if (!selected || !interveneMsg.trim()) return;
    await fetch(`/api/agents/${selected.agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selected.id, message: interveneMsg, role: 'assistant' }),
    });
    setInterveneMsg('');
    // Reload conversation
    const res = await fetch(`/api/conversations/${selected.id}`);
    if (res.ok) setSelected(await res.json());
  };

  const channelIcon: Record<string, string> = { voice: '🔮', phone: '📞', sms: '📱', chat: '💬' };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <p className="text-slate-500 mt-1">View and manage active conversations across all channels</p>
      </div>

      <div className="flex gap-6">
        <div className="w-80 shrink-0">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-sm">All Conversations</h2>
            </div>
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No conversations yet</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {conversations.map(c => (
                  <button key={c.id} onClick={() => setSelected(c)}
                    className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${selected?.id === c.id ? 'bg-accent/5 border-l-2 border-accent' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span>{channelIcon[c.channel] || '💬'}</span>
                      <span className="font-medium text-sm">{c.agentName}</span>
                      <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${c.status === 'active' ? 'bg-accent/10 text-accent' : 'bg-slate-100 text-slate-400'}`}>{c.status}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{c.from} • {c.messages.length} messages</p>
                    <p className="text-xs text-slate-300 mt-0.5">{new Date(c.updatedAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          {selected ? (
            <div className="card flex flex-col h-[calc(100vh-12rem)]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selected.agentName}</h2>
                  <p className="text-xs text-slate-400">{selected.channel} • {selected.from} • {selected.status}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
                      m.role === 'user' ? 'bg-accent text-white' : m.role === 'system' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-slate-100 text-slate-800'
                    }`}>
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${m.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {selected.status === 'active' && (
                <div className="p-4 border-t border-slate-100 flex gap-2">
                  <input className="input flex-1" value={interveneMsg} onChange={e => setInterveneMsg(e.target.value)} placeholder="Intervene as agent..." onKeyDown={e => e.key === 'Enter' && handleIntervene()} />
                  <button onClick={handleIntervene} className="btn-primary">Send</button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-4">💬</p>
              <p className="text-slate-400">Select a conversation to view the transcript</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
