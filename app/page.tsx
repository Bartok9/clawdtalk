'use client';

import { useEffect, useState } from 'react';
import { Agent, Conversation } from '@/lib/types';

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('clawdtalk_agents');
      if (stored) setAgents(JSON.parse(stored));
    } catch {}
    fetch('/api/conversations').then(r => r.json()).then(setConversations).catch(() => {});
  }, []);

  const activeConvs = conversations.filter(c => c.status === 'active');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your AI communication platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Active Agents" value={agents.length} icon="🤖" />
        <StatCard label="Active Conversations" value={activeConvs.length} icon="💬" />
        <StatCard label="Total Conversations" value={conversations.length} icon="📊" />
        <StatCard label="Channels Configured" value={
          (() => { try { const c = localStorage.getItem('clawdtalk_channels'); return c ? JSON.parse(c).length : 0; } catch { return 0; } })()
        } icon="📡" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold">Recent Agents</h2>
          </div>
          <div className="p-6">
            {agents.length === 0 ? (
              <p className="text-slate-400 text-sm">No agents yet. Create one to get started.</p>
            ) : (
              <div className="space-y-3">
                {agents.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-slate-400">{a.provider} / {a.model}</p>
                    </div>
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">{a.channels.length} channels</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold">Recent Conversations</h2>
          </div>
          <div className="p-6">
            {conversations.length === 0 ? (
              <p className="text-slate-400 text-sm">No conversations yet.</p>
            ) : (
              <div className="space-y-3">
                {conversations.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">{c.agentName}</p>
                      <p className="text-xs text-slate-400">{c.channel} • {c.from}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-accent/10 text-accent' : 'bg-slate-100 text-slate-500'}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
