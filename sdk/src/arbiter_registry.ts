import { SorobanRpc } from '@stellar/stellar-sdk';
import { BaseContractClient } from './base';
import { ArbiterInfo, TxOptions } from './types';

export class ArbiterRegistryClient extends BaseContractClient {
  constructor(
    contractId:        string,
    networkPassphrase: string,
    server:            SorobanRpc.Server,
  ) {
    super(contractId, networkPassphrase, server);
  }

  async init(
    admin:       string,
    stakeToken:  string,
    minStake:    bigint,
    opts:        TxOptions,
  ): Promise<void> {
    await this.invoke(
      'init',
      [this.addrVal(admin), this.addrVal(stakeToken), this.i128Val(minStake)],
      opts.secret,
      opts.fee,
    );
  }

  async register(
    arbiter:     string,
    stakeAmount: bigint,
    opts:        TxOptions,
  ): Promise<void> {
    await this.invoke(
      'register',
      [this.addrVal(arbiter), this.i128Val(stakeAmount)],
      opts.secret,
      opts.fee,
    );
  }

  async approveArbiter(arbiter: string, opts: TxOptions): Promise<void> {
    await this.invoke('approve_arbiter', [this.addrVal(arbiter)], opts.secret, opts.fee);
  }

  async revokeArbiter(arbiter: string, opts: TxOptions): Promise<void> {
    await this.invoke('revoke_arbiter', [this.addrVal(arbiter)], opts.secret, opts.fee);
  }

  async isApproved(arbiter: string, callerPub?: string): Promise<boolean> {
    return this.query<boolean>('is_approved', [this.addrVal(arbiter)], callerPub);
  }

  async getArbiter(arbiter: string, callerPub?: string): Promise<ArbiterInfo | null> {
    return this.query<ArbiterInfo | null>('get_arbiter', [this.addrVal(arbiter)], callerPub);
  }

  async listArbiters(callerPub?: string): Promise<string[]> {
    return this.query<string[]>('list_arbiters', [], callerPub);
  }
}
