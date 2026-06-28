import { SorobanRpc } from '@stellar/stellar-sdk';
import { BaseContractClient } from './base';
import { RepSummary, Rating, TxOptions } from './types';

export class ReputationClient extends BaseContractClient {
  constructor(
    contractId:        string,
    networkPassphrase: string,
    server:            SorobanRpc.Server,
  ) {
    super(contractId, networkPassphrase, server);
  }

  async init(escrowContract: string, opts: TxOptions): Promise<void> {
    await this.invoke('init', [this.addrVal(escrowContract)], opts.secret, opts.fee);
  }

  async recordRating(
    rater:       string,
    ratee:       string,
    stars:       number,
    jobId:       bigint,
    milestoneId: number,
    opts:        TxOptions,
  ): Promise<void> {
    await this.invoke(
      'record_rating',
      [
        this.addrVal(rater),
        this.addrVal(ratee),
        this.i32Val(stars),
        this.u64Val(jobId),
        this.u32Val(milestoneId),
      ],
      opts.secret,
      opts.fee,
    );
  }

  async getSummary(addr: string, callerPub?: string): Promise<RepSummary> {
    return this.query<RepSummary>('get_summary', [this.addrVal(addr)], callerPub);
  }

  async getRatings(addr: string, callerPub?: string): Promise<Rating[]> {
    return this.query<Rating[]>('get_ratings', [this.addrVal(addr)], callerPub);
  }

  /** Returns average stars as a human-readable number (e.g. 4.67) */
  async getAverageStars(addr: string, callerPub?: string): Promise<number> {
    const summary = await this.getSummary(addr, callerPub);
    if (summary.total_ratings === 0) return 0;
    return Number(summary.average_x100) / 100;
  }
}
