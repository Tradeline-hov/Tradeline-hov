/**
 * Tradeline — Shared Type Definitions
 *
 * Single source of truth for all domain types used across
 * the Next.js app. These mirror the Soroban contract structs
 * exactly so real on-chain data drops in without conversion.
 */

// ── Milestone lifecycle ───────────────────────────────────────────────────────

export type MilestoneStatus =
  | 'Funded'
  | 'Submitted'
  | 'Approved'
  | 'Disputed'
  | 'Resolved';

export interface Milestone {
  /** Amount in stroops (1 USDC = 10_000_000 stroops) */
  amount:     bigint;
  status:     MilestoneStatus;
  /** Stellar address of the freelancer for this milestone */
  freelancer: string;
}

// ── Job ───────────────────────────────────────────────────────────────────────

export interface Job {
  /**
   * On-chain job ID — the storage key, not part of the contract struct.
   * Added here for convenience in UI state management.
   */
  id:         bigint;
  client:     string;
  arbiter:    string;
  token:      string;
  milestones: Milestone[];
}

// ── Reputation ────────────────────────────────────────────────────────────────

export interface RepSummary {
  total_ratings: number;
  total_stars:   bigint;
  /**
   * Fixed-point average × 100.
   * e.g. 450 means 4.50 stars. Divide by 100 for display.
   */
  average_x100:  bigint;
}

export interface Rating {
  rater:        string;
  ratee:        string;
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

// ── Transaction helpers ───────────────────────────────────────────────────────

export interface TxOptions {
  /** Testnet keypair secret (never use on mainnet in browser) */
  secret: string;
  fee?:   number;
}
