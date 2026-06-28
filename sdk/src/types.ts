/**
 * @tradeline/sdk — Domain Types
 *
 * These mirror the Soroban contract data structures exactly.
 * The app's app/src/types/index.ts is kept in sync manually
 * so the browser bundle never needs the full Stellar SDK.
 */

// ── Milestone lifecycle ───────────────────────────────────────────────────────

export enum MilestoneStatus {
  Funded    = 'Funded',
  Submitted = 'Submitted',
  Approved  = 'Approved',
  Disputed  = 'Disputed',
  Resolved  = 'Resolved',
}

export interface Milestone {
  /** Amount in stroops — 1 USDC = 10_000_000 stroops */
  amount:     bigint;
  status:     MilestoneStatus;
  freelancer: string;
}

// ── Job ───────────────────────────────────────────────────────────────────────

export interface Job {
  client:     string;
  arbiter:    string;
  token:      string;
  milestones: Milestone[];
  /** Next milestone index to be assigned */
  next_id:    number;
}

// ── Reputation ────────────────────────────────────────────────────────────────

export interface RepSummary {
  total_ratings: number;
  total_stars:   bigint;
  /** Fixed-point ×100 — divide by 100 for display (e.g. 467 → 4.67 ★) */
  average_x100:  bigint;
}

export interface Rating {
  rater:        string;
  stars:        number;
  job_id:       bigint;
  milestone_id: number;
  timestamp:    bigint;
}

// ── Arbiter ───────────────────────────────────────────────────────────────────

export interface ArbiterInfo {
  address:           string;
  stake_amount:      bigint;
  approved:          boolean;
  disputes_resolved: number;
}

// ── Transaction ───────────────────────────────────────────────────────────────

export interface TxOptions {
  /** Stellar keypair secret — testnet only */
  secret: string;
  fee?:   number;
}
