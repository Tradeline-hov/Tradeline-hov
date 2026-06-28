/**
 * Tradeline — Demo Seed Script
 *
 * Reproduces the full demo flow on Testnet:
 *
 *   Client posts a 2-milestone job:
 *     Milestone 1 → freelancer delivers → client approves → instant payout ✓
 *     Milestone 2 → freelancer delivers → client disputes → arbiter splits 70/30 ✓
 *
 * Run:  npx ts-node scripts/seed_demo.ts
 *
 * Requires:
 *   DEPLOYER_SECRET  — funds the demo accounts via friendbot
 *   CLIENT_SECRET
 *   FREELANCER_SECRET
 *   ARBITER_SECRET
 *   (all from .env.local or environment)
 */

import 'dotenv/config';
import {
  Keypair,
  Networks,
  SorobanRpc,
} from '@stellar/stellar-sdk';
import { EscrowClient, ArbiterRegistryClient, ReputationClient } from '../sdk/src';

// ── Config ─────────────────────────────────────────────────────────────────────
const RPC_URL              = process.env.RPC_URL              ?? 'https://soroban-testnet.stellar.org';
const ESCROW_ID            = process.env.ESCROW_CONTRACT_ID   ?? '';
const REPUTATION_ID        = process.env.REPUTATION_CONTRACT_ID ?? '';
const ARBITER_REGISTRY_ID  = process.env.ARBITER_REGISTRY_ID  ?? '';

// Testnet Circle USDC SAC
const USDC = process.env.USDC_CONTRACT ?? 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU';

// ── Keypairs — generate fresh or pass in via env ───────────────────────────────
function kp(envVar: string): Keypair {
  const secret = process.env[envVar];
  if (secret) return Keypair.fromSecret(secret);
  const k = Keypair.random();
  console.log(`  [generated] ${envVar}=${k.secret()}`);
  return k;
}

const clientKp     = kp('CLIENT_SECRET');
const freelancerKp = kp('FREELANCER_SECRET');
const arbiterKp    = kp('ARBITER_SECRET');
const adminKp      = kp('ADMIN_SECRET');

// ── Fund via Friendbot ─────────────────────────────────────────────────────────
async function friendbot(addr: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${addr}`);
  if (!res.ok) throw new Error(`Friendbot failed for ${addr}: ${res.statusText}`);
  console.log(`  ✓ Funded ${addr.slice(0, 10)}…`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Tradeline — Demo Seed (Testnet)        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

  const escrow   = new EscrowClient(ESCROW_ID,   Networks.TESTNET, server);
  const arbReg   = new ArbiterRegistryClient(ARBITER_REGISTRY_ID, Networks.TESTNET, server);
  const rep      = new ReputationClient(REPUTATION_ID, Networks.TESTNET, server);

  // ── 1. Fund accounts ──────────────────────────────────────────────────────
  console.log('1. Funding accounts via Friendbot…');
  await Promise.all([
    friendbot(clientKp.publicKey()),
    friendbot(freelancerKp.publicKey()),
    friendbot(arbiterKp.publicKey()),
    friendbot(adminKp.publicKey()),
  ]);

  // ── 2. Register + approve arbiter ─────────────────────────────────────────
  console.log('\n2. Registering arbiter…');
  // Arbiter stakes 10 USDC = 100_000_000 stroops
  await arbReg.register(
    arbiterKp.publicKey(),
    100_000_000n,
    { secret: arbiterKp.secret() },
  );
  console.log('   ✓ Arbiter registered (stake = 10 USDC)');

  await arbReg.approveArbiter(
    arbiterKp.publicKey(),
    { secret: adminKp.secret() },
  );
  console.log('   ✓ Arbiter approved by admin');

  // ── 3. Create job with 2 milestones ───────────────────────────────────────
  console.log('\n3. Client creating job with 2 milestones…');

  const jobId = await escrow.createJob(
    clientKp.publicKey(),
    USDC,
    arbiterKp.publicKey(),
    { secret: clientKp.secret() },
  );
  console.log(`   ✓ Job created  id=${jobId}`);

  // Milestone 1 — 100 USDC (1_000_000_000 stroops)
  const ms1 = await escrow.fundMilestone(
    jobId,
    freelancerKp.publicKey(),
    1_000_000_000n,
    { secret: clientKp.secret() },
  );
  console.log(`   ✓ Milestone 1 funded  id=${ms1}  (100 USDC)`);

  // Milestone 2 — 200 USDC (2_000_000_000 stroops)
  const ms2 = await escrow.fundMilestone(
    jobId,
    freelancerKp.publicKey(),
    2_000_000_000n,
    { secret: clientKp.secret() },
  );
  console.log(`   ✓ Milestone 2 funded  id=${ms2}  (200 USDC)`);

  // ── 4. MILESTONE 1: happy path ────────────────────────────────────────────
  console.log('\n4. Milestone 1 — Happy path…');

  await escrow.submitMilestone(jobId, ms1, { secret: freelancerKp.secret() });
  console.log('   ✓ Freelancer marked milestone 1 as delivered');

  await escrow.approveMilestone(jobId, ms1, { secret: clientKp.secret() });
  console.log('   ✓ Client approved → 100 USDC released to freelancer instantly');

  // ── 5. MILESTONE 2: dispute flow ──────────────────────────────────────────
  console.log('\n5. Milestone 2 — Dispute & resolve (70/30)…');

  await escrow.submitMilestone(jobId, ms2, { secret: freelancerKp.secret() });
  console.log('   ✓ Freelancer marked milestone 2 as delivered');

  await escrow.disputeMilestone(jobId, ms2, clientKp.publicKey(), { secret: clientKp.secret() });
  console.log('   ✓ Client raised dispute');

  // Arbiter splits 70% to freelancer (7000 bps), 30% to client (3000 bps)
  await escrow.resolveDispute(jobId, ms2, 7000, { secret: arbiterKp.secret() });
  console.log('   ✓ Arbiter resolved: 70% → freelancer (140 USDC), 30% → client (60 USDC)');

  // ── 6. Print final state ──────────────────────────────────────────────────
  console.log('\n6. Final on-chain state…');

  const job = await escrow.getJob(jobId, clientKp.publicKey());
  for (let i = 0; i < job.milestones.length; i++) {
    const ms = job.milestones[i];
    console.log(
      `   Milestone ${i + 1}: status=${ms.status}  amount=${(Number(ms.amount) / 1e7).toFixed(2)} USDC`,
    );
  }

  const flRep = await rep.getSummary(freelancerKp.publicKey(), clientKp.publicKey());
  const clRep = await rep.getSummary(clientKp.publicKey(),     freelancerKp.publicKey());

  console.log(`\n   Freelancer reputation: ${(Number(flRep.average_x100) / 100).toFixed(2)} ★  (${flRep.total_ratings} ratings)`);
  console.log(`   Client    reputation: ${(Number(clRep.average_x100) / 100).toFixed(2)} ★  (${clRep.total_ratings} ratings)`);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Demo seed complete ✓                   ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`  Job ID:       ${jobId}`);
  console.log(`  Client:       ${clientKp.publicKey()}`);
  console.log(`  Freelancer:   ${freelancerKp.publicKey()}`);
  console.log(`  Arbiter:      ${arbiterKp.publicKey()}`);
  console.log('');
  console.log('  Paste these into the app to explore each dashboard.\n');
}

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
