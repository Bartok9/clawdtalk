'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/agents', label: 'Agents', icon: '🤖' },
  { href: '/channels', label: 'Channels', icon: '📡' },
  { href: '/conversations', label: 'Conversations', icon: '💬' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-primary text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-accent">Clawd</span>Talk
        </h1>
        <p className="text-xs text-white/50 mt-1">AI Communication Platform</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-accent text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10 text-xs text-white/40">
        Powered by OpenClaw
      </div>
    </aside>
  );
}
