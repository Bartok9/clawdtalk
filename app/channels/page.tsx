'use client';

import { useEffect, useState } from 'react';
import { Channel, Agent } from '@/lib/types';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const c = localStorage.getItem('clawdtalk_channels');
      if (c) setChannels(JSON.parse(c));
      const a = localStorage.getItem('clawdtalk_agents');
      if (a) setAgents(JSON.parse(a));
    } catch {}
  }, []);

  const saveChannels = (list: Channel[]) => {
    setChannels(list);
    localStorage.setItem('clawdtalk_channels', JSON.stringify(list));
  };

  const handleAdd = () => {
    if (!adding) return;
    const channel: Channel = {
      id: crypto.randomUUID(),
      type: adding as Channel['type'],
      name: form.name || adding,
      config: { ...form },
      agentId: form.agentId || undefined,
      createdAt: new Date().toISOString(),
    };
    saveChannels([...channels, channel]);
    setAdding(null);
    setForm({});
  };

  const getEmbedCode = (ch: Channel) => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    if (ch.type === 'voice-orb') {
      return `<script src="${base}/widget/voice-orb.js" data-agent-id="${ch.agentId || ''}" data-color="${ch.config.color || '#16a34a'}" data-api-url="${base}"></script>`;
    }
    if (ch.type === 'live-chat') {
      return `<script src="${base}/widget/chat.js" data-agent-id="${ch.agentId || ''}" data-color="${ch.config.color || '#16a34a'}" data-api-url="${base}"></script>`;
    }
    return '';
  };

  const channelTypes = [
    { type: 'phone', label: 'Phone Number', icon: '📞', desc: 'Inbound/outbound calls via Telnyx' },
    { type: 'sms', label: 'SMS Number', icon: '📱', desc: 'Two-way SMS messaging via Telnyx' },
    { type: 'voice-orb', label: 'Voice Orb', icon: '🔮', desc: 'Embeddable voice widget for websites' },
    { type: 'live-chat', label: 'Live Chat', icon: '💬', desc: 'Embeddable chat widget for websites' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Channels</h1>
          <p className="text-slate-500 mt-1">Configure communication channels for your agents</p>
        </div>
      </div>

      {adding && (
        <div className="card p-6 mb-8 max-w-lg">
          <h2 className="font-semibold mb-4">Add {channelTypes.find(t => t.type === adding)?.label}</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="My Phone Line" />
            </div>
            {(adding === 'phone' || adding === 'sms') && (
              <div>
                <label className="label">Phone Number</label>
                <input className="input" value={form.phoneNumber || ''} onChange={e => setForm({...form, phoneNumber: e.target.value})} placeholder="+1234567890" />
              </div>
            )}
            {(adding === 'voice-orb' || adding === 'live-chat') && (
              <div>
                <label className="label">Widget Color</label>
                <input className="input" type="color" value={form.color || '#16a34a'} onChange={e => setForm({...form, color: e.target.value})} />
              </div>
            )}
            <div>
              <label className="label">Assign Agent</label>
              <select className="input" value={form.agentId || ''} onChange={e => setForm({...form, agentId: e.target.value})}>
                <option value="">Select an agent...</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleAdd} className="btn-accent">Add Channel</button>
              <button onClick={() => { setAdding(null); setForm({}); }} className="btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {channelTypes.map(ct => (
          <button key={ct.type} onClick={() => setAdding(ct.type)} className="card p-6 text-left hover:border-accent transition-colors">
            <span className="text-3xl">{ct.icon}</span>
            <h3 className="font-semibold mt-3">{ct.label}</h3>
            <p className="text-sm text-slate-400 mt-1">{ct.desc}</p>
          </button>
        ))}
      </div>

      {channels.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Configured Channels</h2>
          {channels.map(ch => (
            <div key={ch.id} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{channelTypes.find(t => t.type === ch.type)?.icon}</span>
                  <div>
                    <h3 className="font-medium">{ch.name}</h3>
                    <p className="text-sm text-slate-400">{ch.type} • Agent: {agents.find(a => a.id === ch.agentId)?.name || 'None'}</p>
                  </div>
                </div>
                <button onClick={() => saveChannels(channels.filter(c => c.id !== ch.id))} className="text-sm text-red-500 hover:text-red-700">Remove</button>
              </div>
              {(ch.type === 'voice-orb' || ch.type === 'live-chat') && (
                <div className="mt-4">
                  <label className="label">Embed Code</label>
                  <pre className="bg-slate-50 p-3 rounded-lg text-xs overflow-x-auto border">{getEmbedCode(ch)}</pre>
                </div>
              )}
              {(ch.type === 'phone' || ch.type === 'sms') && ch.config.phoneNumber && (
                <p className="mt-3 text-sm text-slate-500">Number: {ch.config.phoneNumber}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
