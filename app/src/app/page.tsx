import React                                   from 'react';
import Link                                    from 'next/link';
import { Shield, Zap, Star, ArrowRight, Globe } from 'lucide-react';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-16 py-16 px-4">

      {/* Hero */}
      <div className="flex flex-col items-center text-center gap-6 max-w-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-full">
          <Globe className="w-3.5 h-3.5" />
          Built on Stellar Soroban · Testnet Live
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-slate-900 leading-tight">
          Get paid instantly.<br />
          <span className="text-brand-600">No middlemen.</span>
        </h1>

        <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
          Tradeline locks milestone payments in on-chain escrow. Clients approve,
          funds release in the same transaction. Disputes go to a staked neutral
          arbiter. Reputation lives on-chain forever.
        </p>

        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/client"
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-sm">
            I&apos;m a Client <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/freelancer"
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors">
            I&apos;m a Freelancer
          </Link>
          <Link href="/arbiter"
            className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:border-brand-400 hover:text-brand-700 transition-colors">
            Arbiter Console
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
        <FeatureCard
          icon={<Shield className="w-6 h-6 text-brand-600" />}
          title="On-chain escrow"
          desc="USDC locked in a Soroban smart contract. No platform can freeze, redirect, or pocket your funds."
          stat="0% custody risk"
        />
        <FeatureCard
          icon={<Zap className="w-6 h-6 text-amber-500" />}
          title="Instant release"
          desc="Client approves → freelancer receives USDC in the same Stellar transaction. No 7-day holding periods."
          stat="~5 second settlement"
        />
        <FeatureCard
          icon={<Star className="w-6 h-6 text-purple-500" />}
          title="Portable reputation"
          desc="Every milestone rating is recorded on-chain. Build a verifiable work history tied to your Stellar address."
          stat="Immutable on-chain"
        />
      </div>

      {/* How it works */}
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-slate-900 text-center">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {STEPS.map((step, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
              <span className="text-3xl font-black text-slate-100 select-none leading-none">{i + 1}</span>
              <p className="text-sm font-semibold text-slate-800">{step.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="w-full max-w-3xl bg-slate-900 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {STATS.map(s => (
          <div key={s.label} className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-white">{s.value}</span>
            <span className="text-xs text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────

const STEPS = [
  { title: 'Client posts a job',      desc: 'Defines milestones and locks USDC into the escrow contract.' },
  { title: 'Freelancer delivers',     desc: 'Marks the milestone as complete on-chain.' },
  { title: 'Client approves',         desc: 'USDC releases instantly to the freelancer\'s Stellar address.' },
  { title: 'Dispute? Arbiter splits', desc: 'A staked neutral resolver splits funds by basis points.' },
];

const STATS = [
  { value: '0%',   label: 'Platform fee (MVP)' },
  { value: '<5s',  label: 'Settlement time'    },
  { value: '3',    label: 'Smart contracts'    },
  { value: '100%', label: 'Non-custodial'      },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  desc,
  stat,
}: {
  icon:  React.ReactNode;
  title: string;
  desc:  string;
  stat:  string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>
      <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full self-start mt-auto">
        {stat}
      </span>
    </div>
  );
}
