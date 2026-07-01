# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main`  | ✅ Yes    |
| older   | ❌ No     |

Tradeline Protocol is currently in **testnet / pre-production**. Do not use with real funds.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a vulnerability in the smart contracts, SDK, or frontend, report it privately:

1. Open a **GitHub Security Advisory** at:
   `https://github.com/Tradeline-hov/Tradeline-hov/security/advisories/new`

2. Include:
   - A clear description of the vulnerability
   - Steps to reproduce it
   - The potential impact (e.g. fund loss, auth bypass, data leak)
   - Any suggested fix if you have one

We will acknowledge your report within **48 hours** and aim to release a fix within **7 days**
for critical issues.

---

## Scope

The following are **in scope** for security reports:

| Area | Examples |
|------|---------|
| Smart contracts | Reentrancy, auth bypass, fund drain, integer overflow |
| SDK | Unsafe transaction construction, key exposure |
| Frontend | XSS, secret key leakage, wallet auth bypass |
| Indexer | SQL injection, unauthorized data access |

The following are **out of scope**:

- Issues in third-party dependencies (report to them directly)
- Theoretical attacks with no practical exploit path
- Issues only affecting outdated browsers

---

## Known Security Considerations

### Smart Contracts

- **Reentrancy** — All fund-moving functions use a boolean guard in instance storage.
- **Checks-Effects-Interactions** — State is mutated before any `token.transfer()` or cross-contract call.
- **Explicit auth** — Every privileged function calls `require_auth()` on the verified party.
- **Reputation writes** — Only the registered escrow contract address can call `record_rating`.
- **Split arithmetic** — Basis points (u32) with i128 stroops — no floats, no rounding exploits.

### Frontend

- **Testnet only** — The demo wallet stores the connected address in React state.
  **Never use a mainnet secret key in the browser.**
- For production, integrate [Freighter](https://www.freighter.app/) or [Albedo](https://albedo.link/).

### Environment Variables

- `.env.local` and `.env` are in `.gitignore` — never commit them.
- `NEXT_PUBLIC_*` variables are exposed to the browser — never put secrets in them.

---

## Disclosure Policy

We follow **responsible disclosure**. Once a fix is deployed, we will:

1. Credit the reporter in the release notes (unless they prefer anonymity)
2. Publish a post-mortem if the issue affected any live users

---

## License

This security policy applies to all code in this repository under the MIT and Apache-2.0 licenses.
