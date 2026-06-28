/**
 * @tradeline/sdk
 *
 * Typed TypeScript wrappers for the three Tradeline Soroban contracts.
 * Used by the seed script and any external integrations.
 *
 * For the Next.js app, types are re-exported from @/types (app/src/types/index.ts)
 * to keep the browser bundle free of the full Stellar SDK.
 */

// Contract clients
export { EscrowClient }          from './escrow';
export { ReputationClient }      from './reputation';
export { ArbiterRegistryClient } from './arbiter_registry';

// Types (without MilestoneStatus to avoid collision with ./escrow re-export)
export type {
  Milestone,
  Job,
  RepSummary,
  Rating,
  ArbiterInfo,
  TxOptions,
} from './types';

// MilestoneStatus enum from types (single export)
export { MilestoneStatus } from './types';

// Config helpers
export { createClients, TESTNET_CONFIG } from './config';
export type { TradelineConfig }          from './config';
