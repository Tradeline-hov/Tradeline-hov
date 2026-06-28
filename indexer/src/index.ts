/**
 * Tradeline Indexer
 *
 * Polls the Soroban RPC for contract events, parses them,
 * and writes structured data to Postgres.
 *
 * Events handled:
 *   job_created, milestone_funded, milestone_submitted,
 *   milestone_approved, milestone_disputed, dispute_resolved,
 *   rating_recorded
 */

import 'dotenv/config';
import { SorobanRpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { getPool, runMigration } from './db/client';

const RPC_URL         = process.env.RPC_URL         ?? 'https://soroban-testnet.stellar.org';
const ESCROW_ID       = process.env.ESCROW_CONTRACT_ID       ?? '';
const REPUTATION_ID   = process.env.REPUTATION_CONTRACT_ID   ?? '';
const POLL_INTERVAL   = parseInt(process.env.POLL_INTERVAL_MS ?? '5000');

const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });
const db     = getPool();

// ── Cursor helpers ────────────────────────────────────────────────────────────

async function getCursor(): Promise<number> {
  const res = await db.query<{ value: string }>(
    "SELECT value FROM cursor WHERE key = 'ledger'",
  );
  return parseInt(res.rows[0]?.value ?? '0', 10);
}

async function setCursor(ledger: number): Promise<void> {
  await db.query(
    "INSERT INTO cursor(key, value) VALUES ('ledger', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
    [ledger.toString()],
  );
}

// ── Event parsing ─────────────────────────────────────────────────────────────

function decodeTopics(topics: xdr.ScVal[]): string[] {
  return topics.map((t) => {
    try { return String(scValToNative(t)); }
    catch { return t.toXDR('base64'); }
  });
}

function decodeData(data: xdr.ScVal): unknown {
  try { return scValToNative(data); }
  catch { return data.toXDR('base64'); }
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleJobCreated(data: unknown): Promise<void> {
  if (!Array.isArray(data)) return;
  const [jobId, client, arbiter, token] = data as [bigint, string, string, string];
  await db.query(
    `INSERT INTO jobs(id, client, arbiter, token)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [Number(jobId), client, arbiter, token],
  );
  console.log(`  ↳ job_created  job=${jobId}`);
}

async function handleMilestoneFunded(data: unknown): Promise<void> {
  if (!Array.isArray(data)) return;
  const [jobId, milestoneId, freelancer, amount] = data as [bigint, number, string, bigint];
  await db.query(
    `INSERT INTO milestones(job_id, milestone_index, freelancer, amount, status, funded_at)
     VALUES ($1, $2, $3, $4, 'Funded', now())
     ON CONFLICT (job_id, milestone_index) DO NOTHING`,
    [Number(jobId), milestoneId, freelancer, (Number(amount) / 1e7).toString()],
  );
  console.log(`  ↳ milestone_funded  job=${jobId} ms=${milestoneId}`);
}

async function handleMilestoneSubmitted(data: unknown): Promise<void> {
  if (!Array.isArray(data)) return;
  const [jobId, milestoneId] = data as [bigint, number];
  await db.query(
    `UPDATE milestones SET status='Submitted', submitted_at=now()
     WHERE job_id=$1 AND milestone_index=$2`,
    [Number(jobId), milestoneId],
  );
  console.log(`  ↳ milestone_submitted  job=${jobId} ms=${milestoneId}`);
}

async function handleMilestoneApproved(data: unknown): Promise<void> {
  if (!Array.isArray(data)) return;
  const [jobId, milestoneId] = data as [bigint, number, string, bigint];
  await db.query(
    `UPDATE milestones SET status='Approved', approved_at=now()
     WHERE job_id=$1 AND milestone_index=$2`,
    [Number(jobId), milestoneId],
  );
  console.log(`  ↳ milestone_approved  job=${jobId} ms=${milestoneId}`);
}

async function handleMilestoneDisputed(data: unknown): Promise<void> {
  if (!Array.isArray(data)) return;
  const [jobId, milestoneId] = data as [bigint, number];
  await db.query(
    `UPDATE milestones SET status='Disputed', disputed_at=now()
     WHERE job_id=$1 AND milestone_index=$2`,
    [Number(jobId), milestoneId],
  );
  console.log(`  ↳ milestone_disputed  job=${jobId} ms=${milestoneId}`);
}

async function handleDisputeResolved(data: unknown): Promise<void> {
  if (!Array.isArray(data)) return;
  const [jobId, milestoneId, bps] = data as [bigint, number, number, bigint, bigint];
  await db.query(
    `UPDATE milestones
     SET status='Resolved', resolved_at=now(), freelancer_bps=$3
     WHERE job_id=$1 AND milestone_index=$2`,
    [Number(jobId), milestoneId, bps],
  );
  console.log(`  ↳ dispute_resolved  job=${jobId} ms=${milestoneId} bps=${bps}`);
}

async function handleRatingRecorded(data: unknown): Promise<void> {
  if (!Array.isArray(data)) return;
  const [ratee, stars, jobId, milestoneId] = data as [string, number, bigint, number];

  // We don't have the rater in this event — use a placeholder
  await db.query(
    `INSERT INTO reputation(ratee, rater, stars, job_id, milestone_id)
     VALUES ($1, 'system', $2, $3, $4)`,
    [ratee, stars, Number(jobId), milestoneId],
  );

  // Upsert summary
  await db.query(
    `INSERT INTO rep_summary(address, total_ratings, total_stars, average_x100)
     VALUES ($1, 1, $2, $2 * 100)
     ON CONFLICT (address) DO UPDATE
       SET total_ratings = rep_summary.total_ratings + 1,
           total_stars   = rep_summary.total_stars + $2,
           average_x100  = (rep_summary.total_stars + $2) * 100 / (rep_summary.total_ratings + 1),
           updated_at    = now()`,
    [ratee, stars],
  );
  console.log(`  ↳ rating_recorded  ratee=${ratee} stars=${stars}`);
}

// ── Main polling loop ─────────────────────────────────────────────────────────

const EVENT_HANDLERS: Record<string, (data: unknown) => Promise<void>> = {
  job_created:          handleJobCreated,
  milestone_funded:     handleMilestoneFunded,
  milestone_submitted:  handleMilestoneSubmitted,
  milestone_approved:   handleMilestoneApproved,
  milestone_disputed:   handleMilestoneDisputed,
  dispute_resolved:     handleDisputeResolved,
  rating_recorded:      handleRatingRecorded,
};

async function poll(): Promise<void> {
  const fromLedger = await getCursor();
  let   maxLedger  = fromLedger;

  try {
    const events = await server.getEvents({
      startLedger: fromLedger || undefined,
      filters: [
        { type: 'contract', contractIds: [ESCROW_ID] },
        { type: 'contract', contractIds: [REPUTATION_ID] },
      ],
      limit: 100,
    });

    for (const event of events.events) {
      const topics  = decodeTopics(event.topic);
      const topicKey = topics[0]?.replace(/['"]/g, '');
      const data     = decodeData(event.value);

      console.log(`[ledger ${event.ledger}] ${topicKey}`);

      const handler = EVENT_HANDLERS[topicKey ?? ''];
      if (handler) {
        await handler(data).catch((err) =>
          console.error(`  Error handling ${topicKey}:`, err),
        );
      }

      if (event.ledger > maxLedger) maxLedger = event.ledger;
    }

    if (maxLedger > fromLedger) {
      await setCursor(maxLedger + 1);
    }
  } catch (err) {
    console.error('Poll error:', err);
  }
}

async function main(): Promise<void> {
  console.log('Tradeline Indexer starting…');
  await runMigration();
  console.log(`Watching contracts:\n  escrow:     ${ESCROW_ID}\n  reputation: ${REPUTATION_ID}`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await poll();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
