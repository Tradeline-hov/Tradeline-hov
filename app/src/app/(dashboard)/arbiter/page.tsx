'use client';

/**
 * Arbiter Console
 *
 * Allows an approved arbiter to:
 *   1. View their staked arbiter profile
 *   2. Look up any address's reputation before making decisions
 *   3. Load a disputed job and resolve it with a custom split
 *
 * Resolution triggers on-chain fund split + reputation recording.
 */

import { useState }                     from 'react';
import { Gavel, Search, ShieldCheck, Info } from 'lucide-react';
import { MilestoneCard }                from '@/components/MilestoneCard';
import { ReputationBadge }              from '@/components/ReputationBadge';
import { DEMO_JOB, DEMO_REP, DEMO_ARBITER_INFO } from '@/lib/mock-data';
import { isDeployed }                   from '@/lib/contracts';
import { truncateAddr, formatUsdc }     from '@/lib/utils';
import type { Job, MilestoneStatus }    from '@/types';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ArbiterPage() {
  const [lookupId,   setLookupId]   = useState('');
  const [job,        setJob]        = useState<Job | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [actionMs,   setActionMs]   = useState<number | null>(null);

  const [partyAddr,  setPartyAddr]  = useState('');
  const [showRepFor, setShowRepFor] = useState<string | null>(null);
  const [repLoading, setRepLoading] = useState(false);

  const [resolveLog, setResolveLog] = useState<string[]>([]);

  function handleLookup() {
    if (!lookupId) return;
    setLoading(true);
    setTimeout(() => { setJob(DEMO_JOB); setLoading(false); }, 400);
  }

  function handleRepLookup() {
    if (!partyAddr) return;
    setRepLoading(true);
    setTimeout(() => { setShowRepFor(partyAddr); setRepLoading(false); }, 400);
  }

  function handleResolve(i: number, bps: number) {
    if (!job) return;
    setActionMs(i);
    const ms    = job.milestones[i];
    const total = Number(ms.amount) / 10_000_000;
    const fl    = ((total * bps) / 10_000).toFixed(2);
    const cl    = (total - parseFloat(fl)).toFixed(2);

    setTimeout(() => {
      setJob({
        ...job,
        milestones: job.milestones.map((m, idx) =>
          idx === i ? { ...m, status: 'Resolved' as MilestoneStatus } : m),
      });
      setResolveLog(prev => [
        `Milestone ${i + 1}: ${fl} USDC → Freelancer  |  ${cl} USDC → Client  (${(bps / 100).toFixed(0)}% / ${((10_000 - bps) / 100).toFixed(0)}%)`,
        ...prev,
      ]);
      setActionMs(null);
    }, 700);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Arbiter Console</h1>
        {!isDeployed() && <DemoBanner />}
      </div>

      {/* ── Profile ── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
          <ShieldCheck className="w-5 h-5 text-brand-600" /> My Arbiter Profile
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ProfileCard label="Status"          value={DEMO_ARBITER_INFO.approved ? 'Approved' : 'Pending'} green={DEMO_ARBITER_INFO.approved} />
          <ProfileCard label="Stake"           value={`${formatUsdc(DEMO_ARBITER_INFO.stake_amount)} USDC`} />
          <ProfileCard label="Disputes Resolved" value={DEMO_ARBITER_INFO.disputes_resolved.toString()} />
          <ProfileCard label="Network"         value="Testnet" />
        </div>
      </section>

      {/* ── Reputation Lookup ── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
          <Search className="w-5 h-5 text-brand-600" /> Reputation Lookup
        </h2>
        <p className="text-sm text-slate-500">
          Check the on-chain reputation of either party before resolving a dispute.
        </p>
        <div className="flex gap-2">
          <input value={partyAddr} onChange={e => setPartyAddr(e.target.value)}
            placeholder="Stellar address G…"
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            onKeyDown={e => e.key === 'Enter' && handleRepLookup()}
          />
          <button onClick={handleRepLookup} disabled={repLoading}
            className="px-5 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 disabled:opacity-60 transition-colors">
            {repLoading ? 'Loading…' : 'Look up'}
          </button>
        </div>
        {showRepFor && (
          <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2">
            <p className="text-xs text-slate-400 font-mono">{truncateAddr(showRepFor, 12)}</p>
            <ReputationBadge averageX100={DEMO_REP.average_x100} totalRatings={DEMO_REP.total_ratings} size="md" />
          </div>
        )}
      </section>

      {/* ── Resolve Dispute ── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
          <Gavel className="w-5 h-5 text-brand-600" /> Resolve Dispute
        </h2>

        <div className="flex gap-2">
          <input value={lookupId} onChange={e => setLookupId(e.target.value)}
            placeholder="Job ID — try: 1"
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <button onClick={handleLookup} disabled={loading}
            className="px-5 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 disabled:opacity-60 transition-colors">
            {loading ? 'Loading…' : 'Load Job'}
          </button>
        </div>

        {/* Resolution log */}
        {resolveLog.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {resolveLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>{entry}</span>
              </div>
            ))}
          </div>
        )}

        {job && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-2 text-sm">
              <span className="text-slate-400">Job ID</span>  <span className="font-medium">#{job.id.toString()}</span>
              <span className="text-slate-400">Client</span>  <span className="font-mono text-xs truncate">{job.client}</span>
              <span className="text-slate-400">Arbiter</span> <span className="font-mono text-xs truncate">{job.arbiter}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {job.milestones.map((ms, i) => (
                <MilestoneCard key={i} jobId={job.id} index={i} milestone={ms} role="arbiter"
                  onResolve={bps => handleResolve(i, bps)}
                  loading={actionMs === i} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileCard({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${green ? 'text-green-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
      <Info className="w-3.5 h-3.5" />
      Demo mode
    </div>
  );
}
