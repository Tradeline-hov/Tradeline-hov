'use client';

/**
 * Client Dashboard
 *
 * Allows a client to:
 *   1. Post a job with multiple milestones (funding each in USDC)
 *   2. Load an existing job by ID and view milestone status
 *   3. Approve a submitted milestone → instant USDC release
 *   4. Raise a dispute on any funded/submitted milestone
 *
 * Currently uses mock data for UI preview.
 * Replace DEMO_JOB lookups with real escrowClient calls after deployment.
 */

import React, { useState }       from 'react';
import { PlusCircle, Search, Info } from 'lucide-react';
import { MilestoneCard }          from '@/components/MilestoneCard';
import { DEMO_JOB }               from '@/lib/mock-data';
import { isDeployed }             from '@/lib/contracts';
import type { Job, Milestone, MilestoneStatus } from '@/types';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientPage() {
  // Create job form state
  const [freelancer, setFreelancer] = useState('');
  const [arbiter,    setArbiter]    = useState('');
  const [amounts,    setAmounts]    = useState<string[]>(['100', '200']);
  const [creating,   setCreating]   = useState(false);
  const [created,    setCreated]    = useState(false);

  // Job viewer state
  const [lookupId, setLookupId] = useState('');
  const [job,      setJob]      = useState<Job | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [actionMs, setActionMs] = useState<number | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleCreateJob() {
    if (!freelancer || !arbiter) {
      alert('Please fill in Freelancer and Arbiter addresses.');
      return;
    }
    setCreating(true);
    setTimeout(() => {
      const milestones: Milestone[] = amounts.map(a => ({
        amount:     BigInt(Math.round(parseFloat(a || '0') * 10_000_000)),
        status:     'Funded' as MilestoneStatus,
        freelancer,
      }));
      setJob({ id: 1n, client: 'Your address', arbiter, token: DEMO_JOB.token, milestones });
      setCreated(true);
      setCreating(false);
    }, 600);
  }

  function handleLookup() {
    if (!lookupId) return;
    setLoading(true);
    setTimeout(() => {
      setJob(DEMO_JOB);
      setLoading(false);
    }, 400);
  }

  function updateMilestoneStatus(i: number, status: MilestoneStatus) {
    if (!job) return;
    setJob({
      ...job,
      milestones: job.milestones.map((m, idx) => idx === i ? { ...m, status } : m),
    });
  }

  function handleApprove(i: number) {
    setActionMs(i);
    setTimeout(() => { updateMilestoneStatus(i, 'Approved'); setActionMs(null); }, 700);
  }

  function handleDispute(i: number) {
    setActionMs(i);
    setTimeout(() => { updateMilestoneStatus(i, 'Disputed'); setActionMs(null); }, 700);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Client Dashboard</h1>
        {!isDeployed() && <DemoBanner />}
      </div>

      {/* ── Post a Job ── */}
      <Section title="Post a Job" icon={<PlusCircle className="w-5 h-5 text-brand-600" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Freelancer address">
            <input value={freelancer} onChange={e => setFreelancer(e.target.value)}
              placeholder="GFREELANCER…" />
          </Field>
          <Field label="Arbiter address">
            <input value={arbiter} onChange={e => setArbiter(e.target.value)}
              placeholder="GARBITER…" />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Milestone amounts (USDC)</span>
          <div className="flex flex-wrap gap-3">
            {amounts.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-slate-400">M{i + 1}</label>
                <input
                  type="number" value={a} min={0} step={10}
                  onChange={e => {
                    const next = [...amounts];
                    next[i] = e.target.value;
                    setAmounts(next);
                  }}
                  className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {amounts.length > 1 && (
                  <button onClick={() => setAmounts(amounts.filter((_, j) => j !== i))}
                    className="text-slate-300 hover:text-red-400 text-xs transition-colors">✕</button>
                )}
              </div>
            ))}
            <button onClick={() => setAmounts([...amounts, '100'])}
              className="text-xs text-brand-600 hover:underline font-medium">
              + Add milestone
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handleCreateJob} disabled={creating}
            className="px-6 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors">
            {creating ? 'Creating…' : 'Create Job & Fund Milestones'}
          </button>
        </div>

        {created && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="text-green-500">✓</span>
            Job #1 created — milestones funded on-chain.
          </div>
        )}
      </Section>

      {/* ── View Job ── */}
      <Section title="Manage a Job" icon={<Search className="w-5 h-5 text-brand-600" />}>
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
            <JobMeta job={job} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {job.milestones.map((ms, i) => (
                <MilestoneCard key={i} jobId={job.id} index={i} milestone={ms} role="client"
                  onApprove={() => handleApprove(i)}
                  onDispute={() => handleDispute(i)}
                  loading={actionMs === i} />
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({ title, icon, children }: {
  title:    string;
  icon:     React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
      <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {React.cloneElement(children, {
        className: 'border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 w-full',
      })}
    </div>
  );
}

function JobMeta({ job }: { job: Job }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-2 text-sm">
      <span className="text-slate-400">Job ID</span>
      <span className="font-medium">#{job.id.toString()}</span>
      <span className="text-slate-400">Client</span>
      <span className="font-mono text-xs truncate">{job.client}</span>
      <span className="text-slate-400">Arbiter</span>
      <span className="font-mono text-xs truncate">{job.arbiter}</span>
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
      <Info className="w-3.5 h-3.5" />
      Demo mode — deploy contracts to go live
    </div>
  );
}
