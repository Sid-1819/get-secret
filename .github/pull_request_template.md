## Summary

<!-- What changed and why? Keep it focused on the problem being solved. -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing behavior to change)
- [ ] Documentation only
- [ ] Refactor / chore (no user-facing change)

## Related issues

<!-- Branches created from an issue (e.g. `42-fix-title`) auto-close that issue when this PR merges.
     You can also link manually with "Fixes #123" or "Relates to #456". -->

Fixes #

## Test plan

<!-- How did you verify this? Include commands, curl examples, or screenshots where helpful. -->

- [ ] `pnpm run lint`
- [ ] `pnpm run test`
- [ ] `pnpm run test:e2e` (if applicable)
- [ ] Manual verification (describe below)

**Manual checks:**

```bash
# Example:
# pnpm run start:dev
# curl -X POST http://localhost:3000/s ...
```

## Security checklist

<!-- Required for changes touching encryption, auth, rate limits, validation, or secret lifecycle. -->

- [ ] Does not log secret content or passphrases
- [ ] Does not weaken encryption, expiry, or burn-after-read behavior
- [ ] Rate limits and input validation remain intact (or are improved)
- [ ] N/A — this change does not affect security-sensitive code

## Notes for reviewers

<!-- Anything non-obvious: migration steps, env var changes, deployment impact. -->
