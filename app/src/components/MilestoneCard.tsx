'use client';

/**
 * MilestoneCard
 *
 * Renders a single milestone with its status badge and role-appropriate action buttons.
 * - Client  → Approve or Dispute
 * - Freelancer → Mark Delivered or Dispute
 * - Arbiter → Resolve with split slider
 */

import { useState }              from 'react';
import type { Milestone }        from '@/types';
import { formatUsdc, statusBadge, truncateAddr } from '@/lib/utils';

// ── Props ─────────────────────────────────────────────────────────────────────

interface MilestoneCardProps {
  jobId:      bigint;
  index:      number;
  milestone:  Milestone;
  role:       'client' | 'freelancer' | 'arbiter';
  onSubmit?:  () => void;
  onApprove?: () => void;
  onDispute?: () => void;
  onResolve?: (bps: number) => void;
  loading?:   boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MilestoneCard({
  jobId,
  index,
  milestone,
  role,
  onSubmit,
  onApprove,
  onDispute,
  onResolve,
  loading,
}: MilestoneCardProps) {
  const status = milestone.status as string;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 transition hover:shadow-md">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800">Milestone {index + 1}</span>
        <span className={statusBadge(status)}>{status}</span>
      </div>

      {/* ── Details ── */}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-400">Amount</dt>
        <dd className="font-medium text-slate-800">{formatUsdc(milestone.amount)} USDC</dd>

        <dt className="text-slate-400">Freelancer</dt>
        <dd className="font-mono text-xs text-slate-600 truncate">
          {truncateAddr(milestone.freelancer, 8)}
        </dd>

        <dt className="text-slate-400">Job ID</dt>
        <dd className="text-xs text-slate-500">#{jobId.toString()}</dd>
      </dl>

      {/* ── Actions ── */}
      <div className="flex gap-2 flex-wrap pt-1 border-t border-slate-50">
        {role === 'freelancer' && status === 'Funded' && onSubmit && (
          <Btn onClick={onSubmit} loading={loading} label="Mark Delivered" variant="blue" />
        )}

        {role === 'client' && status === 'Submitted' && onApprove && (
          <Btn onClick={onApprove} loading={loading} label="Approve & Release" variant="green" />
        )}

        {(role === 'client' || role === 'freelancer') &&
          (status === 'Submitted' || status === 'Funded') &&
          onDispute && (
            <Btn onClick={onDispute} loading={loading} label="Raise Dispute" variant="red" />
          )}

        {role === 'arbiter' && status === 'Disputed' && onResolve && (
          <ResolveSlider onResolve={onResolve} loading={loading} totalUsdc={formatUsdc(milestone.amount)} />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type BtnVariant = 'blue' | 'green' | 'red';

function Btn({
  onClick, loading, label, variant,
}: {
  onClick:  () => void;
  loading?: boolean;
  label:    string;
  variant:  BtnVariant;
}) {
  const styles: Record<BtnVariant, string> = {
    blue:  'bg-blue-600  hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    red:   'bg-red-500   hover:bg-red-600',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-sm text-white px-4 py-1.5 rounded-xl font-medium transition-colors disabled:opacity-60 ${styles[variant]}`}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
          Processing…
        </span>
      ) : label}
    </button>
  );
}

function ResolveSlider({
  onResolve, loading, totalUsdc,
}: {
  onResolve: (bps: number) => void;
  loading?:  boolean;
  totalUsdc: string;
}) {
  const [bps, setBps] = useState(5000);
  const freelancerPct = (bps / 100).toFixed(0);
  const clientPct     = ((10000 - bps) / 100).toFixed(0);
  const total         = parseFloat(totalUsdc);
  const flAmt         = ((total * bps) / 10000).toFixed(2);
  const clAmt         = (total - parseFloat(flAmt)).toFixed(2);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Freelancer: {freelancerPct}% ({flAmt} USDC)</span>
        <span>Client: {clientPct}% ({clAmt} USDC)</span>
      </div>
      <input
        type="range" min={0} max={10000} step={100} value={bps}
        onChange={e => setBps(parseInt(e.target.value))}
        className="w-full accent-purple-600 cursor-pointer"
      />
      <button
        onClick={() => onResolve(bps)}
        disabled={loading}
        className="text-sm text-white bg-purple-600 hover:bg-purple-700 px-4 py-1.5 rounded-xl font-medium transition-colors disabled:opacity-60"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-1.5">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
            Resolving…
          </span>
        ) : `Resolve — ${freelancerPct}% / ${clientPct}%`}
      </button>
    </div>
  );
}
