/**
 * Tradeline — Contract Configuration
 *
 * Reads deployed contract IDs from environment variables.
 * Populated automatically by scripts/deploy.ps1 into .env.local.
 *
 * Usage in pages (after deployment):
 *   import { getContractConfig } from '@/lib/contracts';
 *   const cfg = getContractConfig();
 */

export interface ContractConfig {
  escrowId:     string;
  reputationId: string;
  arbiterRegId: string;
  rpcUrl:       string;
  usdcId:       string;
}

/**
 * Returns contract IDs from env vars.
 * Empty strings mean contracts haven't been deployed yet — UI falls back to mock data.
 */
export function getContractConfig(): ContractConfig {
  return {
    escrowId:     process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID      ?? '',
    reputationId: process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_ID  ?? '',
    arbiterRegId: process.env.NEXT_PUBLIC_ARBITER_REGISTRY_ID     ?? '',
    rpcUrl:       process.env.NEXT_PUBLIC_RPC_URL                 ?? 'https://soroban-testnet.stellar.org',
    usdcId:       process.env.NEXT_PUBLIC_USDC_CONTRACT           ?? 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU',
  };
}

/** True when all contract IDs are present — switches UI from mock → live */
export function isDeployed(): boolean {
  const cfg = getContractConfig();
  return !!(cfg.escrowId && cfg.reputationId && cfg.arbiterRegId);
}
