'use client';

/**
 * Tradeline — Top Navigation Bar
 *
 * Sticky header with branding, route links, and wallet connection widget.
 */

import Link                 from 'next/link';
import { usePathname }      from 'next/navigation';
import { useState }         from 'react';
import { useWallet }        from '@/lib/wallet-context';
import { truncateAddr, cn } from '@/lib/utils';
import { Wallet, LogOut }   from 'lucide-react';

// ── Nav links ─────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '/client',     label: 'Client'     },
  { href: '/freelancer', label: 'Freelancer' },
  { href: '/arbiter',    label: 'Arbiter'    },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function Nav() {
  const pathname                  = usePathname();
  const { publicKey, connecting, connect, disconnect } = useWallet();
  const [showInput,  setShowInput]  = useState(false);
  const [inputVal,   setInputVal]   = useState('');

  function handleConnect() {
    if (!inputVal.trim()) return;
    connect(inputVal);
    setInputVal('');
    setShowInput(false);
  }

  return (
    <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-bold select-none">
            T
          </span>
          <span className="hidden sm:inline">Tradeline</span>
        </Link>

        {/* ── Nav links ── */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Wallet ── */}
        <div className="flex items-center gap-2 shrink-0">
          {publicKey ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1.5 text-xs bg-brand-50 text-brand-700 px-3 py-1 rounded-full font-mono border border-brand-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {truncateAddr(publicKey)}
              </span>
              <button
                onClick={disconnect}
                title="Disconnect"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : showInput ? (
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Stellar address or secret…"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                autoFocus
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 w-44 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors font-medium"
              >
                {connecting ? '…' : 'Connect'}
              </button>
              <button
                onClick={() => setShowInput(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-brand-700 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
