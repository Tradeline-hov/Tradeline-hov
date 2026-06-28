/**
 * Shared helpers for contract invocations.
 * Handles transaction building, signing, submission, and simulation.
 */
import {
  Contract,
  Keypair,
  Networks,
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  xdr,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
} from '@stellar/stellar-sdk';

export class BaseContractClient {
  protected contract:          Contract;
  protected networkPassphrase: string;
  protected server:            SorobanRpc.Server;

  constructor(
    contractId:        string,
    networkPassphrase: string,
    server:            SorobanRpc.Server,
  ) {
    this.contract          = new Contract(contractId);
    this.networkPassphrase = networkPassphrase;
    this.server            = server;
  }

  /**
   * Build, simulate, sign, and submit a contract call.
   * Returns the decoded return value.
   */
  protected async invoke<T>(
    method: string,
    args:   xdr.ScVal[],
    secret: string,
    fee:    number = parseInt(BASE_FEE),
  ): Promise<T> {
    const keypair = Keypair.fromSecret(secret);
    const account = await this.server.getAccount(keypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee:               fee.toString(),
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    // Simulate to get resource fees
    const simResult = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    const assembled = SorobanRpc.assembleTransaction(tx, simResult).build();
    assembled.sign(keypair);

    const sendResult = await this.server.sendTransaction(assembled);
    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction failed: ${JSON.stringify(sendResult)}`);
    }

    // Poll for confirmation
    let getResult: SorobanRpc.Api.GetTransactionResponse;
    do {
      await new Promise((r) => setTimeout(r, 1000));
      getResult = await this.server.getTransaction(sendResult.hash);
    } while (getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND);

    if (getResult.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(getResult)}`);
    }

    return scValToNative(getResult.returnValue!) as T;
  }

  /**
   * Read-only simulation — no signing required.
   */
  protected async query<T>(
    method:      string,
    args:        xdr.ScVal[],
    callerPub?:  string,
  ): Promise<T> {
    const sourceAccount = callerPub
      ? await this.server.getAccount(callerPub)
      : await this.server.getAccount(
          'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN', // fee-free source
        );

    const tx = new TransactionBuilder(sourceAccount, {
      fee:               BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simResult = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    if (!SorobanRpc.Api.isSimulationSuccess(simResult) || !simResult.result) {
      throw new Error('No result from simulation');
    }

    return scValToNative(simResult.result.retval) as T;
  }

  // ── ScVal helpers ───────────────────────────────────────────────────────────

  protected addrVal(addr: string): xdr.ScVal {
    return Address.fromString(addr).toScVal();
  }

  protected u64Val(n: bigint | number): xdr.ScVal {
    return nativeToScVal(BigInt(n), { type: 'u64' });
  }

  protected u32Val(n: number): xdr.ScVal {
    return nativeToScVal(n, { type: 'u32' });
  }

  protected i32Val(n: number): xdr.ScVal {
    return nativeToScVal(n, { type: 'i32' });
  }

  protected i128Val(n: bigint | number): xdr.ScVal {
    return nativeToScVal(BigInt(n), { type: 'i128' });
  }
}
