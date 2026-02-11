'use client';

import { useEffect, useState } from 'react';
import { Settings } from '@/lib/types';

const defaultSettings: Settings = {
  telnyxApiKey: '', openaiApiKey: '', anthropicApiKey: '', googleApiKey: '', openrouterApiKey: '',
  webhookUrl: '',
  whiteLabel: { logo: '', primaryColor: '#020617', accentColor: '#16a34a', domain: '', companyName: '' },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem('clawdtalk_settings');
      if (s) setSettings(JSON.parse(s));
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem('clawdtalk_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key: keyof Settings, value: string) => setSettings({ ...settings, [key]: value });
  const updateWL = (key: string, value: string) =>
    setSettings({ ...settings, whiteLabel: { ...settings.whiteLabel, [key]: value } });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-slate-500 mt-1">Configure API keys, webhooks, and white-label settings</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-accent">✓ Saved</span>}
          <button onClick={save} className="btn-accent">Save Settings</button>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Telnyx</h2>
          <div>
            <label className="label">API Key</label>
            <input className="input" type="password" value={settings.telnyxApiKey} onChange={e => update('telnyxApiKey', e.target.value)} placeholder="KEY..." />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">LLM API Keys</h2>
          <p className="text-sm text-slate-400 mb-4">Platform-level keys used when agents don&apos;t have their own</p>
          <div className="space-y-4">
            {([['openaiApiKey', 'OpenAI'], ['anthropicApiKey', 'Anthropic'], ['googleApiKey', 'Google'], ['openrouterApiKey', 'OpenRouter']] as const).map(([key, label]) => (
              <div key={key}>
                <label className="label">{label} API Key</label>
                <input className="input" type="password" value={settings[key]} onChange={e => update(key, e.target.value)} placeholder="sk-..." />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Webhooks</h2>
          <div>
            <label className="label">Webhook URL</label>
            <input className="input" value={settings.webhookUrl} onChange={e => update('webhookUrl', e.target.value)} placeholder="https://your-server.com/webhook" />
            <p className="text-xs text-slate-400 mt-1">Receives conversation events</p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">White Label</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input className="input" value={settings.whiteLabel.companyName} onChange={e => updateWL('companyName', e.target.value)} placeholder="Your Company" />
            </div>
            <div>
              <label className="label">Logo URL</label>
              <input className="input" value={settings.whiteLabel.logo} onChange={e => updateWL('logo', e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Primary Color</label>
                <input className="input" type="color" value={settings.whiteLabel.primaryColor} onChange={e => updateWL('primaryColor', e.target.value)} />
              </div>
              <div>
                <label className="label">Accent Color</label>
                <input className="input" type="color" value={settings.whiteLabel.accentColor} onChange={e => updateWL('accentColor', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Custom Domain</label>
              <input className="input" value={settings.whiteLabel.domain} onChange={e => updateWL('domain', e.target.value)} placeholder="talk.yourdomain.com" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
