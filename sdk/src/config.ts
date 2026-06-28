import {
  Networks,
  SorobanRpc,
} from '@stellar/stellar-sdk';
import { EscrowClient }           from './escrow';
import { ReputationClient }       from './reputation';
import { ArbiterRegistryClient }  from './arbiter_registry';

export interface TradelineConfig {
  /** e.g. 'https://soroban-testnet.stellar.org' */
  rpcUrl:                  string;
  networkPassphrase:       string;
  escrowContractId:        string;
  reputationContractId:    string;
  arbiterRegistryId:       string;
}

export const TESTNET_CONFIG: TradelineConfig = {
  rpcUrl:               'https://soroban-testnet.stellar.org',
  networkPassphrase:    Networks.TESTNET,
  escrowContractId:     process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID     ?? '',
  reputationContractId: process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_ID ?? '',
  arbiterRegistryId:    process.env.NEXT_PUBLIC_ARBITER_REGISTRY_ID    ?? '',
};

export function createClients(cfg: TradelineConfig) {
  const server = new SorobanRpc.Server(cfg.rpcUrl, { allowHttp: false });
  return {
    escrow:    new EscrowClient(cfg.escrowContractId,        cfg.networkPassphrase, server),
    reputation: new ReputationClient(cfg.reputationContractId, cfg.networkPassphrase, server),
    arbiter:   new ArbiterRegistryClient(cfg.arbiterRegistryId, cfg.networkPassphrase, server),
    server,
  };
}
