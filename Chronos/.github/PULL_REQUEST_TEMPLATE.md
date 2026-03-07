## Summary

<!-- Describe your changes in 1–3 sentences. Why is this change needed? -->

## Related Issue / HIP

<!-- Link the GitHub issue or Hiero Improvement Proposal this PR addresses. -->
- Closes #
- HIP reference: <!-- e.g. HIP-551, HIP-423 or N/A -->

## Type of Change

<!-- Mark the applicable type(s) with an `x`. -->
- [ ] 🐛 Bug fix (non-breaking)
- [ ] ✨ New feature (non-breaking)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to break)
- [ ] 📝 Documentation update
- [ ] 🔧 CI / tooling change
- [ ] ♻️  Refactor (no functional changes)

## Checklist

- [ ] I have read the [Contributing Guide](../CONTRIBUTING.md)
- [ ] My commit(s) are signed with a GPG key (`git commit -S -s`)
- [ ] Every commit includes a `Signed-off-by:` trailer (`git commit -s`)
- [ ] I have added or updated tests for my changes
- [ ] All existing tests pass locally (`pnpm run test`)
- [ ] The TypeScript compiler reports no errors (`pnpm run type-check`)
- [ ] ESLint passes with no new warnings (`pnpm run lint`)
- [ ] Batch payload logic has been verified against HIP-551 limits (≤ 50 ops, ≤ 6 KB)
- [ ] I have updated documentation / JSDoc where applicable

## Testing

<!-- Describe how you tested this change. Include test commands and relevant output snippets. -->

```bash
pnpm run test:ci
```

## Screenshots / Recordings

<!-- For UI or visual changes, attach screenshots or a recording. -->
