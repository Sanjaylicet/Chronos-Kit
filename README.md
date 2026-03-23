# Chronos-Kit

[![CI](https://github.com/Sanjaylicet/Chronos-Kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Sanjaylicet/Chronos-Kit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

**A Next.js-first TypeScript toolkit for building native programmable payment applications on the [Hiero ledger](https://hiero.org/) (Linux Foundation Decentralized Trust).**

Chronos-Kit implements **[HIP-551](https://hips.hedera.com/hip/hip-551) Atomic Batch Transactions** and **[HIP-423](https://hips.hedera.com/hip/hip-423) Long-Term Scheduled Transactions**, combining both into a single ergonomic API with built-in pre-flight validation, React hooks, and provider-based network wiring — so teams can ship ledger workflows quickly while keeping transaction safety and costs under control.

---

## Why Chronos-Kit

### Problem 1 — Batch transaction complexity (HIP-551)

Atomic batch transactions have a hard 50-inner-tx / 6 KB payload limit. Exceeding it throws `TRANSACTION_OVERSIZE`. Every inner transaction must have `nodeAccountId` stripped to `0.0.0`, and a unique `batchKey` must be injected into every inner transaction but must be absent from the outer container.

Chronos-Kit's `BatchCompiler` handles all of this automatically — chunking, size-guarding, and key injection — so you just pass your transactions in and get back signed, submission-ready batch objects.

### Problem 2 — Scheduled transaction boilerplate (HIP-423)

Long-term scheduled transactions require precise Unix timestamp conversion, `wait_for_expiry` semantics, and careful wrapping. Chronos-Kit's `ScheduleManager` converts a plain JavaScript `Date` into a correctly-configured `ScheduleCreateTransaction` with zero boilerplate.

### Problem 3 — Pre-flight risk for enterprise treasuries

HIP-551 charges non-refundable "failure fees" even when a batch fails. Chronos-Kit's `PreFlightEngine` verifies HBAR liquidity, token associations, freeze flags, and KYC compliance via the Mirror Node REST API before any transaction is ever broadcast — protecting your treasury from silent failures.

---

## Architecture

```
Your React App
      │
      ▼
 ChronosProvider           ← configures network, operator keys, QueryClient
      │
      ├── useHieroAccount  ← Client lifecycle, SDK initialization
      ├── useHieroBatch    ← PreFlight → BatchCompiler → sign → submit
      └── useHieroSchedule ← PreFlight → BatchCompiler → ScheduleManager → sign → submit
                │
                ▼
         lib/ (core)
          ├── MirrorNodeClient   ← paginate(), typed REST responses, backoff
          ├── BatchCompiler      ← HIP-551: chunking, batchKey, 6 KB guard
          ├── ScheduleManager    ← HIP-423: Date → Unix timestamp, wrap()
          └── PreFlightEngine    ← liquidity, association, freeze, KYC checks
                │
                ▼
      Hiero Mirror Node REST API
      Hiero Consensus Nodes (gRPC)
```

---

## Running Locally

```bash
# Clone the repo
git clone https://github.com/Sanjaylicet/Chronos-Kit.git
cd Chronos-Kit/Chronos

# Install dependencies
npm install

# Copy env vars
cp .env.example .env.local
# Fill in your testnet operator account and private key (see below)

# Start the dev server
npm run dev
# → http://localhost:3000

# Type check
npm run type-check

# Run tests
npm test
```

Open [http://localhost:3000](http://localhost:3000) and navigate to [/demo](http://localhost:3000/demo) for the interactive DAO monthly payroll walkthrough.

---

## Environment Variables

Create a `.env.local` file inside the `Chronos/` directory:

```env
# Hiero network target: testnet | mainnet
NEXT_PUBLIC_HEDERA_NETWORK=testnet

# Mirror Node REST API base URL (no trailing slash)
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com/api/v1

# Operator account (the account that pays transaction fees)
NEXT_PUBLIC_OPERATOR_ID=0.0.XXXXX

# Operator private key — ECDSA or ED25519 DER-encoded hex
NEXT_PUBLIC_OPERATOR_KEY=302e...
```

> **Security note:** In a production environment, avoid exposing your private key to the browser. Sign transactions server-side via an API route and pass only the signed bytes to the client.

---

## Quick Start (Next.js 14 App Router)

### 1. Wrap your app in `ChronosProvider`

```tsx
// app/layout.tsx
import { ChronosProvider } from '@/components/providers/ChronosProvider';

const config = {
  network: 'testnet',
  mirrorNodeUrl: process.env.NEXT_PUBLIC_MIRROR_NODE_URL!,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ChronosProvider config={config}>{children}</ChronosProvider>
      </body>
    </html>
  );
}
```

### 2. Initialize the Hiero account client

```tsx
'use client';
import { useHieroAccount } from '@/hooks/useHieroAccount';

export function AccountStatus() {
  const { client, accountId, isReady, error } = useHieroAccount();

  if (!isReady) return <p>Connecting to Hiero…</p>;
  if (error) return <p>Error: {error.message}</p>;
  return <p>Connected as {accountId}</p>;
}
```

### 3. Submit an atomic batch transaction (HIP-551)

```tsx
'use client';
import { useHieroBatch } from '@/hooks/useHieroBatch';
import { TransferTransaction, AccountId, Hbar } from '@hashgraph/sdk';
import type { PreFlightPlan } from '@/lib/preflight';

export function PaymentButton() {
  const { submitBatch, isPending, receipts, error } = useHieroBatch();

  async function handlePay() {
    const tx = new TransferTransaction()
      .addHbarTransfer(AccountId.fromString('0.0.1234'), Hbar.fromTinybars(-1000))
      .addHbarTransfer(AccountId.fromString('0.0.5678'), Hbar.fromTinybars(1000));

    const plan: PreFlightPlan = {
      payerAccountId: '0.0.1234',
      innerTransactions: [tx],
      tokenTransfers: [],
    };

    await submitBatch([tx], plan);
  }

  return (
    <button onClick={handlePay} disabled={isPending}>
      {isPending ? 'Submitting…' : 'Send Payment'}
    </button>
  );
}
```

### 4. Schedule a batch for future execution (HIP-423)

```tsx
'use client';
import { useHieroSchedule } from '@/hooks/useHieroSchedule';
import { TokenWipeTransaction, TokenId, AccountId } from '@hashgraph/sdk';
import type { PreFlightPlan } from '@/lib/preflight';

export function SchedulePayroll() {
  const { scheduleFor, isPending, receipt } = useHieroSchedule();

  async function scheduleMonthlyPayroll() {
    const firstOfNextMonth = new Date();
    firstOfNextMonth.setMonth(firstOfNextMonth.getMonth() + 1, 1);
    firstOfNextMonth.setHours(0, 0, 0, 0);

    const tx = new TokenWipeTransaction()
      .setTokenId(TokenId.fromString('0.0.9999'))
      .setAccountId(AccountId.fromString('0.0.1111'))
      .setAmount(100);

    const plan: PreFlightPlan = {
      payerAccountId: '0.0.1000',
      innerTransactions: [tx],
      tokenTransfers: [],
    };

    await scheduleFor([tx], plan, firstOfNextMonth, 'monthly-payroll');
    console.log('Scheduled! Schedule ID:', receipt?.scheduleId?.toString());
  }

  return (
    <button onClick={scheduleMonthlyPayroll} disabled={isPending}>
      {isPending ? 'Scheduling…' : 'Schedule Payroll'}
    </button>
  );
}
```

---

## API Reference

### `ChronosProvider`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config.network` | `'testnet' \| 'mainnet'` | Yes | Hiero network target |
| `config.mirrorNodeUrl` | `string` | Yes | Mirror Node REST API base URL |

---

### `useHieroAccount()`

Initializes and manages the `@hashgraph/sdk` `Client` lifecycle using environment variables.

```ts
const {
  client,     // Client | null — SDK Client instance
  accountId,  // string | null — operator account ID
  isReady,    // boolean
  error,      // Error | null
} = useHieroAccount()
```

---

### `useHieroBatch()`

Runs pre-flight validation, compiles transactions into HIP-551 atomic batches, signs, and submits.

```ts
const {
  submitBatch,  // (txs: Transaction[], plan: PreFlightPlan) => Promise<TransactionReceipt[]>
  isPending,    // boolean
  isSuccess,    // boolean
  isError,      // boolean
  error,        // Error | PreFlightError | null
  receipts,     // TransactionReceipt[] | null
} = useHieroBatch()
```

**Pre-flight failures** — if any check fails, `submitBatch()` throws a `PreFlightError` with a `failures` array describing exactly what failed (insufficient HBAR, token not associated, account frozen, KYC not granted) before any transaction reaches the network.

---

### `useHieroSchedule()`

Wraps a batch in a HIP-423 `ScheduleCreateTransaction` for future execution.

```ts
const {
  scheduleFor,  // (txs: Transaction[], plan: PreFlightPlan, executeAt: Date, memo?: string) => Promise<TransactionReceipt>
  isPending,    // boolean
  isSuccess,    // boolean
  isError,      // boolean
  error,        // Error | PreFlightError | null
  receipt,      // TransactionReceipt | null
} = useHieroSchedule()
```

---

### `BatchCompiler` (`lib/batch`)

```ts
const compiler = new BatchCompiler()

compiler.add(tx: Transaction): BatchCompiler       // chainable
compiler.compile(): BatchTransaction[]             // one per chunk
```

**Limits enforced automatically:**
- Max 50 inner transactions per chunk
- Max 5,900 bytes per chunk (safety margin below the 6 KB network limit)
- `nodeAccountId` forced to `0.0.0` on every inner transaction
- `batchKey` injected into every inner transaction, absent from the outer container
- `ScheduleCreateTransaction` rejected inside a batch (`BlacklistError`)

---

### `ScheduleManager` (`lib/schedule`)

```ts
const manager = new ScheduleManager()

// Wraps a single compiled batch for deferred execution
manager.wrap(
  batch: BatchTransaction,
  executeAt: Date,
  memo?: string
): ScheduleCreateTransaction
```

---

### `MirrorNodeClient` (`lib/client`)

```ts
const client = new MirrorNodeClient(baseUrl: string)

// Async generator — yields individual items, follows links.next cursors automatically
client.paginate<T>(path: string, options?: PaginateOptions): AsyncGenerator<T>

// Pre-flight query methods
client.verifyHbarBalance(accountId: string, requiredTinybars: bigint): Promise<boolean>
client.verifyTokenAssociation(accountId: string, tokenId: string): Promise<boolean>
client.checkFreezeFlag(accountId: string, tokenId: string): Promise<boolean>
client.checkKycGranted(accountId: string, tokenId: string): Promise<boolean>
```

---

## Enterprise Scenario — DAO Monthly Treasury Payroll

The `/demo` page walks through a complete payroll workflow: wipe, mint, distribute to contributors, and log an audit hash to HCS — all as a single atomic batch scheduled for the first of next month.

```tsx
'use client';
import { useHieroSchedule } from '@/hooks/useHieroSchedule';
import {
  TokenWipeTransaction, TokenMintTransaction,
  TransferTransaction, TopicMessageSubmitTransaction,
  TokenId, AccountId, TopicId,
} from '@hashgraph/sdk';

const CORP_TOKEN   = TokenId.fromString('0.0.9001');
const TREASURY     = AccountId.fromString('0.0.1000');
const PENALIZED    = AccountId.fromString('0.0.2000');
const CONTRIBUTORS = ['0.0.3001','0.0.3002','0.0.3003','0.0.3004','0.0.3005']
  .map(AccountId.fromString);
const AUDIT_TOPIC  = TopicId.fromString('0.0.4000');

export function DAOPayroll() {
  const { scheduleFor, isPending } = useHieroSchedule();

  async function schedulePayroll() {
    const firstOfNextMonth = new Date();
    firstOfNextMonth.setMonth(firstOfNextMonth.getMonth() + 1, 1);
    firstOfNextMonth.setHours(0, 0, 0, 0);

    const transactions = [
      new TokenWipeTransaction()
        .setTokenId(CORP_TOKEN).setAccountId(PENALIZED).setAmount(100),
      new TokenMintTransaction()
        .setTokenId(CORP_TOKEN).setAmount(5000),
      ...CONTRIBUTORS.map(contributor =>
        new TransferTransaction()
          .addTokenTransfer(CORP_TOKEN, TREASURY, -1000)
          .addTokenTransfer(CORP_TOKEN, contributor, 1000)
      ),
      new TopicMessageSubmitTransaction()
        .setTopicId(AUDIT_TOPIC)
        .setMessage(`payroll-${firstOfNextMonth.toISOString()}`),
    ];

    const plan = {
      payerAccountId: TREASURY.toString(),
      innerTransactions: transactions,
      tokenTransfers: [],
    };

    const receipt = await scheduleFor(transactions, plan, firstOfNextMonth, 'dao-payroll');
    console.log('Payroll scheduled:', receipt.scheduleId?.toString());
  }

  return (
    <button onClick={schedulePayroll} disabled={isPending}>
      {isPending ? 'Scheduling…' : 'Schedule Monthly Payroll'}
    </button>
  );
}
```

---

## Project Structure

```
Chronos/
├── app/
│   ├── api/          # Next.js API routes
│   ├── demo/         # Interactive DAO payroll demo page
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AccountDashboard.tsx
│   └── providers/
│       └── ChronosProvider.tsx
├── hooks/
│   ├── useHieroAccount.ts
│   ├── useHieroBatch.ts
│   └── useHieroSchedule.ts
├── lib/
│   ├── batch.ts       # BatchCompiler (HIP-551)
│   ├── client.ts      # MirrorNodeClient
│   ├── errors.ts      # PreFlightError, BlacklistError
│   ├── preflight.ts   # PreFlightEngine
│   ├── schedule.ts    # ScheduleManager (HIP-423)
│   ├── types.ts       # Shared TypeScript types
│   └── utils.ts
└── __tests__/
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.3 |
| Ledger SDK | `@hashgraph/sdk` ^2.40 |
| Data fetching | `@tanstack/react-query` ^5 |
| HTTP client | `axios` ^1.6 |
| Validation | `zod` ^3.22 |
| Testing | `vitest` ^1.6 + `@testing-library/react` |

---

## Contributing

Chronos-Kit follows the Linux Foundation Decentralized Trust contribution standards.

All commits require a **Developer Certificate of Origin** sign-off:

```bash
git commit -s -m "feat: add support for TokenBurnTransaction in BatchCompiler"
```

GPG-signed commits are also encouraged. See [CONTRIBUTING.md](Chronos/CONTRIBUTING.md) for the full setup guide, branch naming conventions, and the PR checklist.

**License:** Apache 2.0 — see [LICENSE](Chronos/LICENSE).

---

## Acknowledgements

Built for the [Hedera Hello Future: Apex Hackathon 2026](https://hackathon.stackup.dev/web/events/hedera-hello-future-apex-hackathon2026).

Inspired by the production patterns of [hiero-enterprise-java](https://github.com/OpenElements/hiero-enterprise-java) and the developer experience of [wagmi](https://wagmi.sh/) for the EVM ecosystem.

The Hiero network is an open-source project under the [Linux Foundation Decentralized Trust](https://www.lfdecentralizedtrust.org/).
