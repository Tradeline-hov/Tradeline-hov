# Tradeline

**Milestone-escrow freelance marketplace on Stellar Soroban.**

> Upwork without the 20% cut and the frozen-funds anxiety.

Clients lock USDC into smart-contract escrow per milestone. Freelancers get paid the instant the client approves. Disputes go to a staked, neutral arbiter who splits funds on-chain with a basis-point slider. Every rating is recorded immutably after each milestone.

---

## Live Demo

> App running at **http://localhost:3000** (run `npm run dev:app` to start)

| Route | Role | What you can do |
|---|---|---|
| `/` | Anyone | Landing page, feature overview |
| `/client` | Client | Post jobs, fund milestones, approve or dispute |
| `/freelancer` | Freelancer | Submit deliverables, view on-chain reputation |
| `/arbiter` | Arbiter | Resolve disputes with split slider, lookup reputation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js App  (app/)                           │
│                                                                       │
│  /client          /freelancer          /arbiter                      │
│     │                  │                   │                         │
│  app/src/                                                            │
│  ├── types/index.ts   ← single source of truth for all domain types │
│  ├── lib/                                                            │
│  │   ├── contracts.ts    contract IDs from env vars                 │
│  │   ├── mock-data.ts    demo data (replaced by SDK post-deploy)    │
│  │   ├── utils.ts        formatUsdc, truncateAddr, statusBadge…     │
│  │   └── wallet-context  connected address provider                 │
│  └── components/                                                     │
│      ├── MilestoneCard   status badge + role actions                │
│      ├── ReputationBadge star display                               │
│      └── Nav             sticky header + wallet connect             │
└────────────────────────────┬────────────────────────────────────────┘
                             │  @tradeline/sdk  (post-deploy)
┌────────────────────────────▼────────────────────────────────────────┐
│                    TypeScript SDK  (sdk/)                            │
│                                                                       │
│  EscrowClient · ReputationClient · ArbiterRegistryClient            │
│  BaseContractClient (sign → simulate → submit → poll)               │
└──────┬─────────────────────────┬───────────────────────────────────┘
       │ Soroban RPC             │ Soroban RPC
┌──────▼──────┐   ┌─────────────▼──────┐   ┌─────────────────────┐
│   escrow    │   │    reputation      │   │   arbiter_registry  │
│  (Soroban)  │   │    (Soroban)       │   │   (Soroban)         │
└─────────────┘   └────────────────────┘   └─────────────────────┘
       │ contract events (7 types)
┌──────▼─────────────────────────────────────────────────────────────┐
│                  Node Indexer  (indexer/)                           │
│  Polls Soroban RPC every 5s · parses events · writes to Postgres   │
└────────────────────────────────────────────────────────────────────┘
```

---

## Contracts

### escrow — `contracts/escrow/src/lib.rs`

Core business logic. Holds all escrowed USDC.

| Function | Who calls | What it does |
|---|---|---|
| `init(rep_contract)` | Deployer | Wires in reputation contract address |
| `create_job(client, token, arbiter)` | Client | Creates a job record, returns `job_id` |
| `fund_milestone(job_id, freelancer, amount)` | Client | Transfers USDC from client → contract |
| `submit_milestone(job_id, milestone_id)` | Freelancer | Marks milestone as delivered |
| `approve_milestone(job_id, milestone_id)` | Client | Releases USDC to freelancer + records rating |
| `dispute_milestone(job_id, milestone_id, caller)` | Client or Freelancer | Escalates to arbiter |
| `resolve_dispute(job_id, milestone_id, freelancer_bps)` | Arbiter | Splits funds by basis points + records rating |

**Security patterns:**
- **Reentrancy guard** — boolean lock in instance storage prevents re-entrant calls
- **Checks-Effects-Interactions** — all state mutations before any token transfers
- **Explicit auth** — `require_auth()` called on the verified party for every write

---

### reputation — `contracts/reputation/src/lib.rs`

Immutable append-only ratings log with a running average.

| Function | Who calls | What it does |
|---|---|---|
| `init(escrow)` | Deployer | Registers the only address allowed to write ratings |
| `record_rating(rater, ratee, stars, job_id, milestone_id)` | Escrow only | Appends rating, updates summary |
| `get_summary(addr)` | Anyone | Returns `{ total_ratings, total_stars, average_x100 }` |
| `get_ratings(addr)` | Anyone | Returns full rating log |

Stars are clamped to 1–5 on-chain. `average_x100` is a fixed-point integer (e.g. `467` = 4.67 stars).

---

### arbiter_registry — `contracts/arbiter_registry/src/lib.rs`

Staked arbiter pool. Arbiters stake USDC as a bond; admin approves before they can be assigned.

| Function | Who calls | What it does |
|---|---|---|
| `init(admin, stake_token, min_stake)` | Deployer | Sets admin and minimum stake |
| `register(arbiter, stake_amount)` | Arbiter | Stakes USDC, enters pending state |
| `approve_arbiter(arbiter)` | Admin | Marks arbiter as active |
| `revoke_arbiter(arbiter)` | Admin | Removes arbiter approval |
| `is_approved(arbiter)` | Anyone | Returns bool |

---

## Project Structure

```
TRADELINE/
│
├── Cargo.toml                       Rust workspace (3 contracts)
├── package.json                     npm workspace root
│
├── contracts/
│   ├── escrow/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs               Contract + unit tests
│   ├── reputation/
│   │   ├── Cargo.toml
│   │   └── src/lib.rs               Contract + unit tests
│   └── arbiter_registry/
│       ├── Cargo.toml
│       └── src/lib.rs               Contract + unit tests
│
├── sdk/                             @tradeline/sdk package
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                 Public exports (no collisions)
│       ├── types.ts                 Shared domain types
│       ├── base.ts                  RPC helpers (sign, sim, submit, poll)
│       ├── escrow.ts                EscrowClient
│       ├── reputation.ts            ReputationClient
│       ├── arbiter_registry.ts      ArbiterRegistryClient
│       └── config.ts               createClients(), TESTNET_CONFIG
│
├── app/                             Next.js 14 frontend
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── src/
│       ├── types/
│       │   └── index.ts             ← SINGLE SOURCE OF TRUTH for types
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx             Landing page
│       │   └── (dashboard)/
│       │       ├── client/page.tsx
│       │       ├── freelancer/page.tsx
│       │       └── arbiter/page.tsx
│       ├── components/
│       │   ├── Nav.tsx
│       │   ├── MilestoneCard.tsx
│       │   └── ReputationBadge.tsx
│       └── lib/
│           ├── contracts.ts         Contract config + isDeployed()
│           ├── mock-data.ts         Demo data (pre-deployment)
│           ├── utils.ts             formatUsdc, truncateAddr, cn…
│           └── wallet-context.tsx   Connected address provider
│
├── indexer/                         Node.js event indexer → Postgres
│   ├── package.json
│   └── src/
│       ├── index.ts                 Polling loop + all 7 event handlers
│       └── db/
│           ├── client.ts            pg Pool + migration runner
│           ├── migrate.ts           Standalone migration entry point
│           └── schema.sql           jobs, milestones, reputation tables
│
└── scripts/
    ├── deploy.ps1                   Windows: build + deploy + init all contracts
    ├── deploy.sh                    Linux/Mac equivalent
    └── seed_demo.ts                 Full 2-milestone demo on Testnet
```

---

## Getting Started

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust | stable | https://rustup.rs |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | latest | `cargo install --locked stellar-cli --features opt` |
| Node.js | ≥ 20 | https://nodejs.org |
| Postgres | ≥ 14 | https://postgresql.org (indexer only) |

---

### Run the UI (no blockchain needed)

```powershell
# Install dependencies
npm install

# Start Next.js dev server
& "C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next dev --cwd app
```

Then open **http://localhost:3000**.

The app runs in **demo mode** — all actions use mock data with animated state transitions so you can explore every flow without deploying contracts.

---

### Deploy to Testnet

```powershell
# 1. Generate and fund a deployer account
stellar keys generate --global deployer --network testnet --fund

# 2. Build and deploy all 3 contracts, initialise them, write .env.local
.\scripts\deploy.ps1

# 3. Start the app (now connected to live contracts)
npm run dev:app
```

---

### Run the Demo Seed

After deployment, seed the full 2-milestone demo flow:

```powershell
npm run seed
```

This script:
1. Funds 4 fresh Testnet accounts via Friendbot
2. Registers and approves a demo arbiter (staking 10 USDC)
3. Creates a job with **Milestone 1 = 100 USDC**, **Milestone 2 = 200 USDC**
4. **Milestone 1** — freelancer delivers → client approves → 100 USDC released instantly
5. **Milestone 2** — freelancer delivers → client disputes → arbiter splits 70/30 → 140 USDC to freelancer, 60 USDC to client
6. Prints final balances and on-chain reputation for both parties

---

### Run Contract Tests

```powershell
# All contracts
cargo test

# Individual
cargo test -p tradeline-escrow
cargo test -p tradeline-reputation
cargo test -p tradeline-arbiter-registry
```

**Test coverage:**

| Test | Contract | What it verifies |
|---|---|---|
| `test_happy_path_approve` | escrow | fund → submit → approve → full balance released |
| `test_dispute_resolve_70_30` | escrow | dispute → resolve 7000 bps → exact split amounts |
| `test_reentrancy_blocked` | escrow | guard prevents re-entrant fund call |
| `test_invalid_split_above_10000` | escrow | bps > 10 000 panics |
| `test_approve_before_submit_fails` | escrow | approve without submit panics |
| `test_record_and_average` | reputation | two ratings → correct average_x100 |
| `test_stars_clamped` | reputation | 10-star input clamped to 5 |
| `test_register_and_approve` | arbiter_registry | register → approve → revoke cycle |

---

### Start the Indexer

```powershell
# Create Postgres database
createdb tradeline

# Run migration + start polling
npm run dev:indexer
```

The indexer polls the Soroban RPC every 5 seconds, handles 7 event types, and writes to these tables:

| Table | Contents |
|---|---|
| `jobs` | Job ID, client, arbiter, token |
| `milestones` | Status history with timestamps |
| `reputation` | Individual ratings log |
| `rep_summary` | Aggregated average per address |
| `cursor` | Last processed ledger (resumable) |

---

## SDK Usage

```typescript
import { createClients, TESTNET_CONFIG } from '@tradeline/sdk';

const { escrow, reputation, arbiter } = createClients(TESTNET_CONFIG);

// Post a job
const jobId = await escrow.createJob(clientAddr, usdcAddr, arbiterAddr, { secret });

// Fund milestones (100 USDC and 200 USDC)
const ms1 = await escrow.fundMilestone(jobId, freelancerAddr, 1_000_000_000n, { secret });
const ms2 = await escrow.fundMilestone(jobId, freelancerAddr, 2_000_000_000n, { secret });

// Freelancer submits milestone 1
await escrow.submitMilestone(jobId, ms1, { secret: freelancerSecret });

// Client approves → instant USDC release
await escrow.approveMilestone(jobId, ms1, { secret: clientSecret });

// Client disputes milestone 2
await escrow.disputeMilestone(jobId, ms2, clientAddr, { secret: clientSecret });

// Arbiter resolves 70% to freelancer
await escrow.resolveDispute(jobId, ms2, 7000, { secret: arbiterSecret });

// Read reputation
const avg = await reputation.getAverageStars(freelancerAddr);
console.log(`${avg} ★`); // e.g. "4.67 ★"
```

---

## Environment Variables

### `app/.env.local`

```env
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_ESCROW_CONTRACT_ID=          # set by deploy.ps1
NEXT_PUBLIC_REPUTATION_CONTRACT_ID=      # set by deploy.ps1
NEXT_PUBLIC_ARBITER_REGISTRY_ID=         # set by deploy.ps1
NEXT_PUBLIC_USDC_CONTRACT=CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU
```

### `indexer/.env`

```env
RPC_URL=https://soroban-testnet.stellar.org
ESCROW_CONTRACT_ID=
REPUTATION_CONTRACT_ID=
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tradeline
POLL_INTERVAL_MS=5000
```

---

## Security

| Pattern | Where | Detail |
|---|---|---|
| Reentrancy guard | escrow | Boolean lock in instance storage; cleared after every guarded function |
| Checks-Effects-Interactions | escrow | State written before any `token.transfer()` or cross-contract call |
| Explicit auth | all contracts | `require_auth()` on every privileged address before state mutation |
| Single writer | reputation | Only the registered escrow contract can call `record_rating` |
| Integer-only math | escrow | Basis points (u32) + i128 stroops; no floats; no rounding exploits |
| Clamped stars | reputation | Stars clamped to 1–5 on-chain regardless of caller input |

> **Testnet only** — the demo wallet stores the connected address in React state. For mainnet, integrate [Freighter](https://www.freighter.app/) or [Albedo](https://albedo.link/) and never expose a secret key in the browser.

---

## Revenue Model

The protocol charges a configurable basis-point fee at `approve_milestone` and `resolve_dispute`. Stubbed to 0% in the MVP. Activate by adding to the escrow contract:

```rust
let fee_bps: u32 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(50); // 0.5%
let fee    = (amount * fee_bps as i128) / 10_000;
let payout = amount - fee;
token_client.transfer(&env.current_contract_address(), &treasury, &fee);
token_client.transfer(&env.current_contract_address(), &freelancer, &payout);
```

At 0.5% on $1M monthly GMV → **$5,000/month** with zero custody risk.

---

## License

MIT
