# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| `main`  | ✅ Active          |
| < 0.1.0 | ❌ Not supported   |

> **Testnet only.** Tradeline Protocol is pre-production software. Do not use with real funds on Stellar mainnet.

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately via one of these channels:

1. **GitHub Security Advisory** (preferred):
   [Create a private advisory →](https://github.com/Tradeline-hov/Tradeline-hov/security/advisories/new)

2. Include in your report:
   - A clear description of the vulnerability
   - Exact steps to reproduce it
   - The potential impact (e.g. fund drain, auth bypass, data exposure)
   - Affected component (`escrow`, `reputation`, `arbiter_registry`, SDK, app, indexer)
   - Your suggested fix if you have one

**Response SLA:**

| Severity | Acknowledgement | Fix target |
|----------|----------------|------------|
| Critical | 24 hours | 3 days |
| High | 48 hours | 7 days |
| Medium | 72 hours | 14 days |
| Low | 7 days | Next release |

---

## Scope

### In scope

| Area | Examples |
|------|---------|
| Smart contracts | Reentrancy, auth bypass, fund drain, integer overflow/underflow |
| SDK | Unsafe transaction construction, secret key exposure |
| Frontend | XSS, wallet auth bypass, secret key leakage via logs or storage |
| Indexer | SQL injection, unauthorised data access |

### Out of scope

- Vulnerabilities in third-party dependencies — report to them directly
- Theoretical attacks with no practical exploit path
- Issues only affecting outdated or unsupported browsers
- Social engineering or phishing attacks targeting users

---

## Security Architecture

### Smart Contracts

| Pattern | Implementation |
|---------|---------------|
| **Reentrancy guard** | Boolean lock in instance storage; set before any external call, cleared after |
| **Checks-Effects-Interactions** | All storage writes happen before `token.transfer()` or cross-contract calls |
| **Explicit auth** | `require_auth()` called on the verified party before every state mutation |
| **Single writer** | Only the registered escrow contract address can call `record_rating` on the reputation contract |
| **Integer arithmetic** | Basis points (u32) + i128 stroops — no floating point, no rounding exploits |
| **Clamped inputs** | Stars clamped to 1–5 on-chain; split bps validated ≤ 10 000 |

### Frontend

- **Testnet demo mode** — the wallet context stores the connected address in React state. This is intentional for demo purposes only.
- **Mainnet guidance** — for production use, integrate [Freighter](https://www.freighter.app/) or [Albedo](https://albedo.link/). Never expose a secret key in the browser.
- **Environment variables** — `NEXT_PUBLIC_*` vars are exposed to the browser by design (contract IDs only, no secrets). Private keys must never be placed in `.env.local`.

### Environment & Secrets

- `.env.local` and `.env` are in `.gitignore` — never commit them
- `NEXT_PUBLIC_*` variables contain only public contract addresses
- Secrets (deployer keys, admin keys) must be stored in GitHub Actions Secrets for CI/CD use only

---

## Known Limitations (Pre-Production)

1. **No mainnet deployment** — contracts have not been audited for mainnet use
2. **No formal audit** — a professional smart contract security audit has not yet been conducted
3. **Demo wallet** — the browser wallet is for testnet demos only; it does not use hardware signing or a proper wallet extension

---

## Disclosure Policy

We follow **coordinated responsible disclosure**:

1. Reporter submits vulnerability privately
2. Maintainers acknowledge and begin investigation
3. Fix is developed and tested
4. Fix is deployed to all affected environments
5. Reporter is credited in the release notes (unless they prefer anonymity)
6. A post-mortem is published for critical issues

---

## Hall of Fame

Security researchers who responsibly disclose valid vulnerabilities will be credited here.

*None yet — be the first.*
