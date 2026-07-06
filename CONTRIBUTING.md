# Contributing to Tradeline Protocol

Thank you for your interest in contributing. This document covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

By participating in this project you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Tradeline-hov.git
   cd Tradeline-hov
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/Tradeline-hov/Tradeline-hov.git
   ```
4. **Install dependencies** — see [Development Setup](#development-setup)
5. **Create a branch** for your change:
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## How to Contribute

### Good first issues

Look for issues labelled [`good first issue`](https://github.com/Tradeline-hov/Tradeline-hov/issues?q=label%3A%22good+first+issue%22) — these are intentionally scoped to be approachable for newcomers.

### What we welcome

- Bug fixes with a clear reproduction case
- New tests that increase coverage
- Documentation improvements
- Performance improvements with benchmarks
- Feature additions that align with the roadmap

### What needs discussion first

- Breaking changes to contract interfaces
- New contract deployments or changes to storage layout
- Changes to the arbitration or reputation model
- New external dependencies

For anything large, open an issue first to discuss the approach before writing code.

---

## Development Setup

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust | stable | https://rustup.rs |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | latest | `cargo install --locked stellar-cli --features opt` |
| Node.js | ≥ 20 | https://nodejs.org |

### Install and run

```bash
# Install JS dependencies
npm install

# Run the Next.js app
npm run dev:app
# → http://localhost:3000

# Run all contract tests
cargo test --workspace

# Type check the SDK
cd sdk && npx tsc --noEmit

# Type check the app
cd app && npx tsc --noEmit
```

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `ci` | CI/CD configuration changes |
| `chore` | Maintenance tasks |

**Examples:**

```
feat(escrow): add milestone expiry with auto-refund
fix(contracts): replace b-string topics with symbol_short!
docs(readme): add deployment instructions
test(reputation): add edge case for zero-rating address
ci: add Node 22 to matrix
```

---

## Pull Request Process

1. **Sync your branch** with upstream before opening a PR:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure CI passes** locally before pushing:
   ```bash
   cargo test --workspace
   cd app && npx tsc --noEmit && npx next build
   ```

3. **Fill out the PR template** completely — incomplete PRs will be closed.

4. **One concern per PR** — keep PRs focused. Large PRs are hard to review.

5. **Request a review** — tag a maintainer if no one reviews within 48 hours.

6. **Address feedback** — respond to all review comments, even if just to say you've noted them.

### PR title format

Follow the same Conventional Commits format as commit messages.

---

## Reporting Bugs

Use the **Bug Report** issue template. Include:

- A clear, concise description
- Steps to reproduce
- Expected vs actual behaviour
- Environment (OS, Node version, Rust version, browser if relevant)
- Any relevant logs or screenshots

**Security vulnerabilities** must be reported privately — see [SECURITY.md](./SECURITY.md).

---

## Suggesting Features

Use the **Feature Request** issue template. Include:

- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered
- Any relevant prior art

---

## Questions?

Open a [Discussion](https://github.com/Tradeline-hov/Tradeline-hov/discussions) rather than an issue for general questions.
