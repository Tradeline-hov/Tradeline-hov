# Changelog

All notable changes to Tradeline Protocol are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Freighter wallet integration (replace demo secret-key input)
- Milestone expiry with automatic client refund
- Protocol fee configuration (basis points to treasury)
- Arbiter assignment from registry in escrow contract
- Postgres-backed job listing API for the indexer
- Full Testnet deployment and seed data

---

## [0.1.0] — 2026-07-06

### Added

#### Smart Contracts (Soroban)
- `escrow` contract — create jobs, fund milestones, submit, approve, dispute, resolve
  - Reentrancy guard via boolean lock in instance storage
  - Checks-Effects-Interactions ordering on all fund-moving functions
  - Explicit `require_auth()` on every privileged operation
  - `dispute_milestone` accepts explicit `caller` param for correct Soroban auth
  - `resolve_dispute` splits funds by basis points (0–10 000) with integer arithmetic
- `reputation` contract — immutable ratings log with fixed-point average (×100)
  - Write-restricted to registered escrow contract address only
  - Stars clamped to 1–5 on-chain regardless of caller input
- `arbiter_registry` contract — staked arbiter pool with admin approval workflow
- Unit tests: happy path, 70/30 dispute split, reentrancy guard, invalid split, approve-before-submit

#### TypeScript SDK (`@tradeline/sdk`)
- `EscrowClient` — typed wrappers for all escrow contract functions
- `ReputationClient` — `getSummary`, `getRatings`, `getAverageStars`
- `ArbiterRegistryClient` — `register`, `approveArbiter`, `isApproved`, `listArbiters`
- `BaseContractClient` — shared sign → simulate → submit → poll RPC helpers
- `createClients()` factory with `TESTNET_CONFIG` preset

#### Next.js App
- Landing page with feature overview, how-it-works steps, stats bar
- Client dashboard — post jobs, fund milestones, approve/dispute
- Freelancer dashboard — submit deliverables, view on-chain reputation
- Arbiter console — resolve disputes with live split slider, reputation lookup
- Wallet context provider (demo mode: accepts Stellar address directly)
- `app/src/types/index.ts` — single source of truth for all domain types
- `isDeployed()` flag — UI shows demo banner until contracts are deployed
- Tailwind with full brand colour scale and component utility classes

#### Node.js Indexer
- Polls Soroban RPC every 5 seconds for contract events
- Handles 7 event types: `job_crtd`, `ms_fund`, `ms_sub`, `ms_appr`, `ms_disp`, `disp_res`, `rating_rec`
- Writes to Postgres: `jobs`, `milestones`, `reputation`, `rep_summary`, `cursor`
- Resumable via ledger cursor

#### Scripts
- `deploy.ps1` / `deploy.sh` — build, deploy, and initialise all three contracts
- `seed_demo.ts` — full 2-milestone demo on Testnet (happy path + 70/30 dispute)

#### Repository
- MIT + Apache-2.0 dual licence
- `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1)
- `SECURITY.md` with responsible disclosure process
- `CONTRIBUTING.md` with setup guide and PR process
- GitHub Actions CI — contracts (build + test), SDK (tsc), app (tsc + build), indexer (tsc)
- Issue templates: bug report, feature request
- Pull request template

### Fixed
- Event topics changed from `b"string"` (`&[u8; N]`) to `symbol_short!()` for Soroban SDK v21 compatibility
- App `tsconfig.json` target raised to ES2020 to support BigInt literals
- Removed `@stellar/stellar-sdk` from app browser bundle (not needed client-side)
- Google Fonts moved from CSS `@import` to `<link>` tags to prevent CI build failures
- Indexer updated to `rpc as SorobanRpc` import path for stellar-sdk v12

---

[Unreleased]: https://github.com/Tradeline-hov/Tradeline-hov/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Tradeline-hov/Tradeline-hov/releases/tag/v0.1.0
