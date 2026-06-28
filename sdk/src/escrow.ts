import { SorobanRpc } from '@stellar/stellar-sdk';
import { BaseContractClient } from './base';
import { Job, Milestone, TxOptions } from './types';

export class EscrowClient extends BaseContractClient {
  constructor(
    contractId:        string,
    networkPassphrase: string,
    server:            SorobanRpc.Server,
  ) {
    super(contractId, networkPassphrase, server);
  }

  // ── Write operations ────────────────────────────────────────────────────────

  async init(repContract: string, opts: TxOptions): Promise<void> {
    await this.invoke('init', [this.addrVal(repContract)], opts.secret, opts.fee);
  }

  async createJob(
    client:  string,
    token:   string,
    arbiter: string,
    opts:    TxOptions,
  ): Promise<bigint> {
    return this.invoke<bigint>(
      'create_job',
      [this.addrVal(client), this.addrVal(token), this.addrVal(arbiter)],
      opts.secret,
      opts.fee,
    );
  }

  async fundMilestone(
    jobId:      bigint,
    freelancer: string,
    amount:     bigint,
    opts:       TxOptions,
  ): Promise<number> {
    return this.invoke<number>(
      'fund_milestone',
      [this.u64Val(jobId), this.addrVal(freelancer), this.i128Val(amount)],
      opts.secret,
      opts.fee,
    );
  }

  async submitMilestone(
    jobId:       bigint,
    milestoneId: number,
    opts:        TxOptions,
  ): Promise<void> {
    await this.invoke(
      'submit_milestone',
      [this.u64Val(jobId), this.u32Val(milestoneId)],
      opts.secret,
      opts.fee,
    );
  }

  async approveMilestone(
    jobId:       bigint,
    milestoneId: number,
    opts:        TxOptions,
  ): Promise<void> {
    await this.invoke(
      'approve_milestone',
      [this.u64Val(jobId), this.u32Val(milestoneId)],
      opts.secret,
      opts.fee,
    );
  }

  async disputeMilestone(
    jobId:       bigint,
    milestoneId: number,
    caller:      string,
    opts:        TxOptions,
  ): Promise<void> {
    await this.invoke(
      'dispute_milestone',
      [this.u64Val(jobId), this.u32Val(milestoneId), this.addrVal(caller)],
      opts.secret,
      opts.fee,
    );
  }

  async resolveDispute(
    jobId:          bigint,
    milestoneId:    number,
    freelancerBps:  number,
    opts:           TxOptions,
  ): Promise<void> {
    await this.invoke(
      'resolve_dispute',
      [this.u64Val(jobId), this.u32Val(milestoneId), this.u32Val(freelancerBps)],
      opts.secret,
      opts.fee,
    );
  }

  // ── Read operations ─────────────────────────────────────────────────────────

  async getJob(jobId: bigint, callerPub?: string): Promise<Job> {
    return this.query<Job>('get_job', [this.u64Val(jobId)], callerPub);
  }

  async getMilestoneInfo(
    jobId:       bigint,
    milestoneId: number,
    callerPub?:  string,
  ): Promise<Milestone> {
    return this.query<Milestone>(
      'get_milestone_info',
      [this.u64Val(jobId), this.u32Val(milestoneId)],
      callerPub,
    );
  }
}
