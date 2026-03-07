# Changelog

All notable changes to Chronos-Kit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- `@chronos-kit/core` — initial monorepo package with HIP-551 and HIP-423 scaffolding
- `@chronos-kit/react` — React Context providers and hooks scaffold
- `MirrorNodeClient` — axios-based Mirror Node REST API client with async pagination generator
- `BatchCompiler` — HIP-551 atomic batch transaction compiler (6 KB / 50-op enforcement)
- `ScheduleManager` — HIP-423 long-term scheduled transaction builder
- Custom error hierarchy: `ChronosError`, `BatchSizeExceededError`, `TransactionCountExceededError`, `InsufficientBalanceError`, `PreFlightValidationError`, `MirrorNodeError`
- `ChronosProvider` — root React context wrapping TanStack Query's `QueryClientProvider`
- `HieroAccountProvider` — scoped account tracking context
- `useHieroAccount`, `useHieroBatch`, `useHieroSchedule` hooks
- GitHub Actions: `ci.yml` (lint → build → unit → integration with hiero-solo-action), `dco.yml` (DCO + GPG enforcement), `release.yml` (Changesets-based publish)
- Husky git hooks: `commit-msg` (DCO + commitlint), `pre-commit` (lint-staged)
- Turbo task graph (`turbo.json`) for cached monorepo builds
- Unit test scaffolding for utilities and error classes
- GitHub issue templates (bug report, feature request)
- Apache-2.0 `LICENSE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`

---

[Unreleased]: https://github.com/chronos-kit/chronos-kit/compare/HEAD...HEAD
