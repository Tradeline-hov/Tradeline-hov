'use client';

/**
 * Freelancer Dashboard
 *
 * Allows a freelancer to:
 *   1. View their on-chain reputation score
 *   2. Load a job by ID and see assigned milestones
 *   3. Mark a milestone as delivered (submit)
 *   4. Raise a dispute on a milestone
 */

import { useState }                   from 'react';
import { Search, Award, Star, Info }  from 'lucide-react';
import { MilestoneCard }              from '@/components/MilestoneCard';
import { ReputationBadge }            from '@/components/ReputationBadge';
import { DEMO_JOB, DEMO_REP }         from '@/lib/mock-data';
import { isDeployed }                 from '@/lib/contracts';
import type { Job, MilestoneStatus }  from '@/types';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FreelancerPage() {
  const [lookupId,  setLookupId]  = useState('');
  const [job,       setJob]       = useState<Job | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [actionMs,  setActionMs]  = useState<number | null>(null);
  const [showRep,   setShowRep]   = useState(false);
  const [repLoading, setRepLoading] = useState(false);

  function handleLookup() {
    if (!lookupId) return;
    setLoading(true);
    setTimeout(() => { setJob(DEMO_JOB); setLoading(false); }, 400);
  }

  function handleRepLoad() {
    setRepLoading(true);
    setTimeout(() => { setShowRep(true); setRepLoading(false); }, 500);
  }

  function updateStatus(i: number, status: MilestoneStatus) {
    if (!job) return;
    setJob({ ...job, milestones: job.milestones.map((m, idx) => idx === i ? { ...m, status } : m) });
  }

  function handleSubmit(i: number) {
    setActionMs(i);
    setTimeout(() => { updateStatus(i, 'Submitted'); setActionMs(null); }, 700);
  }

  function handleDispute(i: number) {
    setActionMs(i);
    setTimeout(() => { updateStatus(i, 'Disputed'); setActionMs(null); }, 700);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Freelancer Dashboard</h1>
        {!isDeployed() && <DemoBanner />}
      </div>

      {/* ── Reputation ── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
          <Award className="w-5 h-5 text-brand-600" /> My On-Chain Reputation
        </h2>
        <p className="text-sm text-slate-500">
          Ratings are recorded immutably on Stellar after every milestone completion.
        </p>

        {showRep ? (
          <div className="flex flex-col gap-3">
            <ReputationBadge
              averageX100={DEMO_REP.average_x100}
              totalRatings={DEMO_REP.total_ratings}
              size="lg"
            />
            <div className="grid grid-cols-3 gap-3 max-w-xs">
              <StatCard label="Total Jobs"    value={DEMO_REP.total_ratings.toString()} />
              <StatCard label="Total Stars"   value={DEMO_REP.total_stars.toString()} />
              <StatCard label="Avg Score"     value={(Number(DEMO_REP.average_x100) / 100).toFixed(2)} />
            </div>
          </div>
        ) : (
          <button onClick={handleRepLoad} disabled={repLoading}
            className="self-start flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 disabled:opacity-60 transition-colors">
            <Star className="w-4 h-4" />
            {repLoading ? 'Loading…' : 'Load My Reputation'}
          </button>
        )}
      </section>

      {/* ── Jobs ── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
          <Search className="w-5 h-5 text-brand-600" /> My Jobs
        </h2>

        <div className="flex gap-2">
          <input value={lookupId} onChange={e => setLookupId(e.target.value)}
            placeholder="Job ID — try: 1"
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <button onClick={handleLookup} disabled={loading}
            className="px-5 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 disabled:opacity-60 transition-colors">
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>

        {job && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-2 text-sm">
              <span className="text-slate-400">Job ID</span>  <span className="font-medium">#{job.id.toString()}</span>
              <span className="text-slate-400">Client</span>  <span className="font-mono text-xs truncate">{job.client}</span>
              <span className="text-slate-400">Arbiter</span> <span className="font-mono text-xs truncate">{job.arbiter}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {job.milestones.map((ms, i) => (
                <MilestoneCard key={i} jobId={job.id} index={i} milestone={ms} role="freelancer"
                  onSubmit={() => handleSubmit(i)}
                  onDispute={() => handleDispute(i)}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
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
