'use client';

import { useEffect, useState } from 'react';
import { Agent, LLMProvider, MODEL_LIST, TELNYX_VOICES } from '@/lib/types';

const emptyAgent = (): Partial<Agent> => ({
  name: '', description: '', systemPrompt: '', voice: TELNYX_VOICES[0],
  provider: 'openai', model: 'gpt-4o', apiKey: '', knowledgeBase: '', channels: [],
});

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editing, setEditing] = useState<Partial<Agent> | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem('clawdtalk_agents');
      if (s) setAgents(JSON.parse(s));
    } catch {}
  }, []);

  const save = (list: Agent[]) => {
    setAgents(list);
    localStorage.setItem('clawdtalk_agents', JSON.stringify(list));
  };

  const handleSave = () => {
    if (!editing?.name) return;
    const agent: Agent = {
      id: editing.id || crypto.randomUUID(),
      name: editing.name || '',
      description: editing.description || '',
      systemPrompt: editing.systemPrompt || '',
      voice: editing.voice || TELNYX_VOICES[0],
      provider: editing.provider || 'openai',
      model: editing.model || 'gpt-4o',
      apiKey: editing.apiKey || '',
      knowledgeBase: editing.knowledgeBase || '',
      channels: editing.channels || [],
      createdAt: editing.createdAt || new Date().toISOString(),
    };
    const existing = agents.findIndex(a => a.id === agent.id);
    const updated = existing >= 0 ? agents.map(a => a.id === agent.id ? agent : a) : [...agents, agent];
    save(updated);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    save(agents.filter(a => a.id !== id));
  };

  const models = editing ? (MODEL_LIST[editing.provider || 'openai'] || []) : [];

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">{editing.id ? 'Edit Agent' : 'New Agent'}</h1>
          <button onClick={() => setEditing(null)} className="btn-outline">Cancel</button>
        </div>
        <div className="card p-6 space-y-6 max-w-2xl">
          <div>
            <label className="label">Name</label>
            <input className="input" value={editing.name || ''} onChange={e => setEditing({...editing, name: e.target.value})} placeholder="Customer Support Agent" />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={editing.description || ''} onChange={e => setEditing({...editing, description: e.target.value})} placeholder="Handles customer inquiries" />
          </div>
          <div>
            <label className="label">System Prompt</label>
            <textarea className="input min-h-[120px]" value={editing.systemPrompt || ''} onChange={e => setEditing({...editing, systemPrompt: e.target.value})} placeholder="You are a helpful customer support agent..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">LLM Provider</label>
              <select className="input" value={editing.provider || 'openai'} onChange={e => setEditing({...editing, provider: e.target.value as LLMProvider, model: MODEL_LIST[e.target.value]?.[0] || ''})}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="label">Model</label>
              {models.length > 0 ? (
                <select className="input" value={editing.model || ''} onChange={e => setEditing({...editing, model: e.target.value})}>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input className="input" value={editing.model || ''} onChange={e => setEditing({...editing, model: e.target.value})} placeholder="model-name" />
              )}
            </div>
          </div>
          <div>
            <label className="label">API Key (optional — falls back to platform key)</label>
            <input className="input" type="password" value={editing.apiKey || ''} onChange={e => setEditing({...editing, apiKey: e.target.value})} placeholder="sk-..." />
          </div>
          <div>
            <label className="label">Voice (Telnyx TTS)</label>
            <select className="input" value={editing.voice || ''} onChange={e => setEditing({...editing, voice: e.target.value})}>
              {TELNYX_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Knowledge Base</label>
            <textarea className="input min-h-[80px]" value={editing.knowledgeBase || ''} onChange={e => setEditing({...editing, knowledgeBase: e.target.value})} placeholder="Paste knowledge base content, URLs, or FAQs..." />
          </div>
          <div>
            <label className="label">Channels</label>
            <div className="flex gap-3 flex-wrap">
              {['phone', 'sms', 'voice-orb', 'live-chat'].map(ch => (
                <label key={ch} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.channels?.includes(ch) || false} onChange={e => {
                    const channels = editing.channels || [];
                    setEditing({...editing, channels: e.target.checked ? [...channels, ch] : channels.filter(c => c !== ch)});
                  }} />
                  {ch}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="btn-accent">Save Agent</button>
            <button onClick={() => setEditing(null)} className="btn-outline">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-slate-500 mt-1">Create and manage your AI agents</p>
        </div>
        <button onClick={() => setEditing(emptyAgent())} className="btn-accent">+ New Agent</button>
      </div>

      {agents.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">🤖</p>
          <p className="text-lg font-medium">No agents yet</p>
          <p className="text-slate-400 mt-1 mb-6">Create your first AI agent to start communicating with customers</p>
          <button onClick={() => setEditing(emptyAgent())} className="btn-accent">Create Agent</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(a => (
            <div key={a.id} className="card p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{a.name}</h3>
                  <p className="text-sm text-slate-400">{a.description}</p>
                </div>
                <span className="text-2xl">🤖</span>
              </div>
              <div className="space-y-2 text-sm text-slate-500 mb-4">
                <p><span className="font-medium text-slate-700">Provider:</span> {a.provider}</p>
                <p><span className="font-medium text-slate-700">Model:</span> {a.model}</p>
                <p><span className="font-medium text-slate-700">Voice:</span> {a.voice}</p>
                <div className="flex gap-1 flex-wrap">
                  {a.channels.map(ch => (
                    <span key={ch} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{ch}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(a)} className="btn-outline text-xs">Edit</button>
                <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
