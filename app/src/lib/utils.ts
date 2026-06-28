/**
 * Tradeline — UI Utility Helpers
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge }               from 'tailwind-merge';
import type { MilestoneStatus }  from '@/types';

// ── Tailwind class merging ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── USDC formatting ───────────────────────────────────────────────────────────

/** Convert stroops (7 decimal places) to human-readable USDC string. */
export function formatUsdc(stroops: bigint | number): string {
  const n = typeof stroops === 'bigint' ? Number(stroops) : stroops;
  return (n / 10_000_000).toFixed(2);
}

// ── Address display ───────────────────────────────────────────────────────────

/** Shorten a Stellar address for display: GABCD…WXYZ */
export function truncateAddr(addr: string, chars = 6): string {
  if (!addr || addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

// ── Status badge CSS class ────────────────────────────────────────────────────

const STATUS_CLASSES: Record<MilestoneStatus, string> = {
  Funded:    'badge-funded',
  Submitted: 'badge-submitted',
  Approved:  'badge-approved',
  Disputed:  'badge-disputed',
  Resolved:  'badge-resolved',
};

export function statusBadge(status: string): string {
  return (
    STATUS_CLASSES[status as MilestoneStatus] ??
    'bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium'
  );
}

// ── Reputation display ────────────────────────────────────────────────────────

/** Convert fixed-point ×100 average to display string: e.g. 450 → "4.50" */
export function starsDisplay(averageX100: bigint | number): string {
  const n = typeof averageX100 === 'bigint' ? Number(averageX100) : averageX100;
  return (n / 100).toFixed(2);
}

/** Map a 0–10000 bps value to a star rating 1–5 */
export function bpsToStars(bps: number): number {
  return Math.max(1, Math.round((bps / 10_000) * 5));
}
