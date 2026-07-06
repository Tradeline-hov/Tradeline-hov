## Summary

<!-- What does this PR do? Why? One or two sentences. -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] CI / tooling change
- [ ] Refactor (no functional change)

## Related issues

<!-- Link any related issues: Closes #123, Fixes #456 -->

## Changes made

<!-- Bullet points of what changed and why -->

-
-

## Testing

<!-- How was this tested? Which tests were added or updated? -->

- [ ] Existing tests pass (`cargo test --workspace`)
- [ ] New tests added for new behaviour
- [ ] App builds without errors (`cd app && npx next build`)
- [ ] TypeScript type checks pass (`npx tsc --noEmit`)

## Contract changes

<!-- If this modifies a Soroban contract, answer these: -->

- [ ] No contract changes
- [ ] Storage layout is backward-compatible
- [ ] All new functions have `require_auth()` on privileged addresses
- [ ] No new external calls before state mutations (CEI pattern)
- [ ] Reentrancy guard applied to fund-moving functions

## Screenshots / logs

<!-- For UI changes, include before/after screenshots. For contract changes, include test output. -->

## Checklist

- [ ] My branch is rebased on `main`
- [ ] I have read the [CONTRIBUTING](../CONTRIBUTING.md) guide
- [ ] My code follows the existing style
- [ ] I have updated documentation where needed
- [ ] I have updated `CHANGELOG.md` under `[Unreleased]`
