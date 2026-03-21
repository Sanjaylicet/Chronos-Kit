# Contributing to Chronos-Kit

Thank you for your interest in contributing to Chronos-Kit! This guide explains how to set up your environment, run the test suite, and comply with the project's Developer Certificate of Origin (DCO) requirement.

## Prerequisites

- **Node.js 20+** and **npm** (no pnpm, yarn, or turbo)
- A Hedera testnet account (for manual integration testing)

## Fork and Clone

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/Chronos-Kit.git
cd Chronos-Kit

# 2. Add the upstream remote so you can pull future changes
git remote add upstream https://github.com/Sanjaylicet/Chronos-Kit.git
```

## Install Dependencies

```bash
npm install
```

> **Important:** This project uses **npm only**. Do not commit `pnpm-lock.yaml`, `yarn.lock`, or any Turbo configuration.

## Environment Variables

Copy the example env file and fill in your testnet credentials:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_MIRROR_NODE_URL` | Base URL for the Hiero mirror node |
| `NEXT_PUBLIC_HEDERA_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_OPERATOR_ID` | Your operator account ID (e.g. `0.0.1001`) |
| `NEXT_PUBLIC_OPERATOR_KEY` | Private key hex for the operator account |

## Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The `/demo` route demonstrates the full DAO payroll flow.

## Run Tests

```bash
npm test
```

All 47 Vitest tests must pass before submitting a pull request.

## Type Checking

```bash
npm run type-check
```

Zero TypeScript errors are required.

## Developer Certificate of Origin (DCO)

This project enforces the [Developer Certificate of Origin](https://developercertificate.org/). Every commit you push **must** include a `Signed-off-by` trailer.

### Signing a single commit

```bash
git commit -s -m "feat: add HIP-551 chunk size validation"
```

### Signing all commits on a branch (amend/rebase)

```bash
git rebase --signoff HEAD~<number-of-commits>
```

The DCO GitHub Action will block merging any PR that contains unsigned commits.

## Pull Request Checklist

Before opening a pull request, confirm **all** of the following:

- [ ] `npm run type-check` passes with zero errors
- [ ] `npm test` passes (47/47 tests green)
- [ ] `npm run build` produces a clean build with no warnings
- [ ] Every commit has a `Signed-off-by: Your Name <you@example.com>` trailer (`git commit -s`)
- [ ] Only `npm` is used — no pnpm, yarn, or turbo commands or lock files
- [ ] New public APIs include JSDoc comments
- [ ] If you changed a hook or provider, the relevant test file in `__tests__/` is updated

## Code Style

The project uses TypeScript strict mode. Keep functions small, prefer named exports, and co-locate types with the module that owns them. There is no separate linter config — rely on the TypeScript compiler for correctness.

## Reporting Issues

Open a GitHub Issue and include:
- Chronos-Kit version / git SHA
- Node.js version (`node -v`)
- Minimal reproduction steps
- Expected vs. actual behavior

## License

By contributing you agree that your contributions will be licensed under the [Apache 2.0 License](./LICENSE).
