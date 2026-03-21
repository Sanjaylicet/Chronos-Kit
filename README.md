# Chronos-Kit

[![CI](https://github.com/your-org/chronos-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/chronos-kit/actions/workflows/ci.yml)
[![DCO](https://github.com/your-org/chronos-kit/actions/workflows/dco.yml/badge.svg)](https://github.com/your-org/chronos-kit/actions/workflows/dco.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

**A production-ready TypeScript + React toolkit for building native programmable payment applications on the [Hiero ledger](https://hiero.org/) (Linux Foundation Decentralized Trust).**

Chronos-Kit eliminates the three biggest sources of developer friction in the Hiero ecosystem: unreliable node routing, verbose Mirror Node pagination boilerplate, and the raw complexity of HIP-551 Atomic Batch Transactions and HIP-423 Long-Term Scheduled Transactions.

---

## Why Chronos-Kit

### Problem 1 — `INVALID_NODE_ACCOUNT` crashes your app

The `@hiero-ledger/sdk` uses a static internal node list. When a Governing Council member leaves the network, the SDK still tries to route to their decommissioned node — throwing `INVALID_NODE_ACCOUNT` or a silent gRPC timeout. Chronos-Kit's `useHieroAccount` hook ping-tests every node on mount and removes unresponsive ones before your first transaction ever fires.

### Problem 2 — Mirror Node pagination is N+1 boilerplate

Every Mirror Node response returns a `links.next` cursor. Following it manually means writing iterative fetch loops in every component that needs historical data. Chronos-Kit's `MirrorNodeClient.paginate()` is an async generator that follows cursors automatically — you `for await` over items, not pages.

### Problem 3 — HIP-551 and HIP-423 are full of sharp edges

Atomic batch transactions have a hard 50-inner-tx / 6 KB payload limit. Exceeding it throws `TRANSACTION_OVERSIZE`. Every inner transaction needs `nodeAccountId` stripped to `0.0.0`. A unique `batchKey` must be injected into every inner transaction but must be absent from the outer container. Long-term scheduled transactions require `wait_for_expiry: true` and precise Unix timestamps.

Chronos-Kit's `BatchCompiler` and `ScheduleManager` handle all of this automatically, and the `PreFlightEngine` verifies HBAR liquidity, token associations, freeze flags, and KYC compliance before any transaction is broadcast — protecting enterprise treasuries from HIP-551's non-refundable "failure fees."

---

## Architecture

```
Your React App
      │
      ▼
 ChronosProvider           ← configures network, operator keys, QueryClient
      │
      ├── useHieroAccount  ← Client lifecycle, ping-tested node routing
      ├── useHieroBatch    ← PreFlight → BatchCompiler → sign → submit
      └── useHieroSchedule ← BatchCompiler → ScheduleManager → sign → submit
                │
                ▼
         lib/ (core)
          ├── MirrorNodeClient   ← paginate(), typed REST responses, backoff
          ├── BatchCompiler      ← HIP-551: chunking, batchKey, 6kb guard
          ├── ScheduleManager    ← HIP-423: wait_for_expiry, Date → Unix ts
          └── PreFlightEngine    ← liquidity, association, freeze, KYC checks
                │
                ▼
      Hiero Mirror Node REST API
      Hiero Consensus Nodes (gRPC)
```

---

## Installation

```bash
npm install chronos-kit
# or
pnpm add chronos-kit
```

**Peer dependencies:**

```bash
npm install @hiero-ledger/sdk @tanstack/react-query react react-dom
```

---

## Quick start (Next.js 14 App Router)

### 1. Wrap your app in `ChronosProvider`

```tsx
// app/layout.tsx
import { ChronosProvider } from 'chronos-kit/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ChronosProvider
          network="testnet"
          mirrorNodeUrl={process.env.NEXT_PUBLIC_MIRROR_NODE_URL!}
          operatorAccountId={process.env.NEXT_PUBLIC_OPERATOR_ACCOUNT_ID!}
          operatorPrivateKey={process.env.OPERATOR_PRIVATE_KEY!}
        >
          {children}
        </ChronosProvider>
      </body>
    </html>
  )
}
```

### 2. Submit an atomic batch transaction

```tsx
'use client'
import { useHieroBatch } from 'chronos-kit/react'
import { TransferTransaction, AccountId, Hbar } from '@hiero-ledger/sdk'

export function PaymentButton() {
  const { addTransaction, submitBatch, isPending, data, error } = useHieroBatch()

  async function handlePay() {
    const tx = new TransferTransaction()
      .addHbarTransfer(AccountId.fromString('0.0.1234'), Hbar.fromTinybars(-1000))
      .addHbarTransfer(AccountId.fromString('0.0.5678'), Hbar.fromTinybars(1000))

    addTransaction(tx)
    await submitBatch()
  }

  return (
    <button onClick={handlePay} disabled={isPending}>
      {isPending ? 'Submitting...' : 'Send Payment'}
    </button>
  )
}
```

### 3. Schedule a batch for future execution

```tsx
'use client'
import { useHieroSchedule } from 'chronos-kit/react'
import { TokenWipeTransaction, TokenId, AccountId } from '@hiero-ledger/sdk'

export function SchedulePayroll() {
  const { scheduleFor, isPending } = useHieroSchedule()

  async function scheduleMonthlyPayroll() {
    const firstOfNextMonth = new Date()
    firstOfNextMonth.setMonth(firstOfNextMonth.getMonth() + 1, 1)
    firstOfNextMonth.setHours(0, 0, 0, 0)

    const result = await scheduleFor(firstOfNextMonth, [
      new TokenWipeTransaction()
        .setTokenId(TokenId.fromString('0.0.9999'))
        .setAccountId(AccountId.fromString('0.0.1111'))
        .setAmount(100),
      // ... more transactions
    ])

    console.log('Schedule IDs:', result.scheduleIds)
  }

  return (
    <button onClick={scheduleMonthlyPayroll} disabled={isPending}>
      Schedule Payroll
    </button>
  )
}
```

### 4. Paginate Mirror Node data

```tsx
import { MirrorNodeClient } from 'chronos-kit'

const client = new MirrorNodeClient(process.env.NEXT_PUBLIC_MIRROR_NODE_URL!)

// Automatically follows all links.next cursors — no manual pagination
for await (const tx of client.paginate('/api/v1/transactions', { 'account.id': '0.0.1234' })) {
  console.log(tx.transaction_id, tx.result)
}
```

---

## Environment variables

Create a `.env.local` file at your project root:

```env
# Mirror Node REST API base URL (no trailing slash)
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com

# Operator account (the account that pays transaction fees)
NEXT_PUBLIC_OPERATOR_ACCOUNT_ID=0.0.XXXXX

# Operator private key — keep this server-side only in production
OPERATOR_PRIVATE_KEY=302e...

# Network: testnet | mainnet | previewnet
NEXT_PUBLIC_HIERO_NETWORK=testnet
```

> **Security note:** Never expose `OPERATOR_PRIVATE_KEY` to the browser. In production, sign transactions server-side via an API route and pass only the signed bytes to the client.

---

## API reference

### `ChronosProvider`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `network` | `'testnet' \| 'mainnet' \| 'previewnet'` | Yes | Hiero network target |
| `mirrorNodeUrl` | `string` | Yes | Mirror Node REST API base URL |
| `operatorAccountId` | `string` | Yes | Account ID paying transaction fees |
| `operatorPrivateKey` | `string` | Yes | Ed25519 or ECDSA private key |

---

### `useHieroAccount()`

Manages `Client` lifecycle with automatic ping-tested node routing.

```ts
const {
  client,        // @hiero-ledger/sdk Client instance
  accountId,     // string — operator account ID
  isConnected,   // boolean
  isLoading,     // boolean
  error,         // Error | null
} = useHieroAccount()
```

---

### `useHieroBatch()`

Compiles, pre-flight-checks, and submits atomic batch transactions (HIP-551).

```ts
const {
  addTransaction,  // (tx: Transaction) => void
  clearBatch,      // () => void
  submitBatch,     // () => Promise<BatchResult>
  isPending,       // boolean
  error,           // PreFlightError | Error | null
  data,            // BatchResult | undefined
} = useHieroBatch()
```

**`BatchResult`**

```ts
interface BatchResult {
  receipts: TransactionReceipt[]
  scheduleIds?: string[]
}
```

**Pre-flight failures** — if any check fails, `submitBatch()` throws a `PreFlightError` with a `failures` array describing exactly what failed (insufficient HBAR, token not associated, account frozen, KYC not granted) before any transaction reaches the network.

---

### `useHieroSchedule()`

Wraps a batch in a `ScheduleCreateTransaction` for future execution (HIP-423).

```ts
const {
  scheduleFor,   // (executeAt: Date, txs: Transaction[]) => Promise<ScheduleResult>
  isPending,     // boolean
  error,         // Error | null
} = useHieroSchedule()

interface ScheduleResult {
  scheduleIds: string[]   // one per batch chunk
}
```

---

### `MirrorNodeClient`

```ts
const client = new MirrorNodeClient(baseUrl: string)

// Async generator — yields individual items, follows cursors automatically
client.paginate<T>(path: string, params?: Record<string, string>): AsyncGenerator<T>

// Pre-flight query methods
client.verifyHbarBalance(accountId: string, requiredTinybars: bigint): Promise<boolean>
client.verifyTokenAssociation(accountId: string, tokenId: string): Promise<boolean>
client.checkFreezeFlag(accountId: string, tokenId: string): Promise<boolean>
client.checkKycGranted(accountId: string, tokenId: string): Promise<boolean>
```

---

### `BatchCompiler`

```ts
const compiler = new BatchCompiler()

compiler.add(tx: Transaction): BatchCompiler       // chainable
compiler.compile(): BatchTransaction[]             // one per chunk
compiler.getPayloadSize(): number                  // current chunk bytes
```

**Limits enforced automatically:**
- Max 50 inner transactions per chunk
- Max 5,900 bytes per chunk (hard 6 KB network limit with safety margin)
- `nodeAccountId` forced to `0.0.0` on every inner transaction
- `batchKey` injected into every inner transaction, absent from outer container
- `ScheduleCreateTransaction` rejected inside a batch (`BlacklistError`)

---

### `ScheduleManager`

```ts
const manager = new ScheduleManager()

manager.scheduleFor(
  executeAt: Date,
  batch: BatchTransaction,
  opts?: { memo?: string; payerAccountId?: string }
): ScheduleCreateTransaction

manager.scheduleMultiple(
  payloads: Array<{ executeAt: Date; batch: BatchTransaction }>
): ScheduleCreateTransaction[]
```

---

## Enterprise scenario — DAO monthly treasury payroll

The following example schedules a complete payroll workflow — wipe, mint, distribute to 5 contributors, and log an audit hash to HCS — as a single atomic batch, deferred to the first of next month.

```tsx
'use client'
import { useHieroSchedule } from 'chronos-kit/react'
import {
  TokenWipeTransaction, TokenMintTransaction,
  TransferTransaction, TopicMessageSubmitTransaction,
  TokenId, AccountId, TopicId
} from '@hiero-ledger/sdk'
import { createHash } from 'crypto'

const CORP_TOKEN   = TokenId.fromString('0.0.9001')
const TREASURY     = AccountId.fromString('0.0.1000')
const PENALIZED    = AccountId.fromString('0.0.2000')
const CONTRIBUTORS = ['0.0.3001','0.0.3002','0.0.3003','0.0.3004','0.0.3005']
  .map(AccountId.fromString)
const AUDIT_TOPIC  = TopicId.fromString('0.0.4000')

export function DAOPayroll() {
  const { scheduleFor, isPending, data } = useHieroSchedule()

  async function schedulePayroll() {
    const firstOfNextMonth = new Date()
    firstOfNextMonth.setMonth(firstOfNextMonth.getMonth() + 1, 1)
    firstOfNextMonth.setHours(0, 0, 0, 0)

    const auditHash = createHash('sha256')
      .update(`payroll-${firstOfNextMonth.toISOString()}`)
      .digest('hex')

    const transactions = [
      // 1. Wipe 100 tokens from penalized account
      new TokenWipeTransaction()
        .setTokenId(CORP_TOKEN).setAccountId(PENALIZED).setAmount(100),

      // 2. Mint 5000 new tokens
      new TokenMintTransaction()
        .setTokenId(CORP_TOKEN).setAmount(5000),

      // 3–7. Distribute 1000 tokens to each contributor
      ...CONTRIBUTORS.map(contributor =>
        new TransferTransaction()
          .addTokenTransfer(CORP_TOKEN, TREASURY, -1000)
          .addTokenTransfer(CORP_TOKEN, contributor, 1000)
      ),

      // 8. Submit immutable audit log to HCS
      new TopicMessageSubmitTransaction()
        .setTopicId(AUDIT_TOPIC)
        .setMessage(auditHash),
    ]

    const result = await scheduleFor(firstOfNextMonth, transactions)
    console.log('Payroll scheduled:', result.scheduleIds)
  }

  return (
    <div>
      <button onClick={schedulePayroll} disabled={isPending}>
        {isPending ? 'Scheduling...' : 'Schedule Monthly Payroll'}
      </button>
      {data && <p>Scheduled: {data.scheduleIds.join(', ')}</p>}
    </div>
  )
}
```

This uses 8 inner transactions, well within the 50-tx limit. The `PreFlightEngine` verifies all 5 contributor accounts are associated with `CORP_TOKEN` and that the treasury holds enough HBAR before the batch is ever broadcast.

---

## Running locally

```bash
# Clone the repo
git clone https://github.com/your-org/chronos-kit.git
cd chronos-kit

# Install dependencies
npm install

# Copy env vars
cp .env.example .env.local
# Fill in your testnet operator account and private key

# Start the dev server
npm run dev
# → http://localhost:3000

# Type check
npm run type-check

# Run tests
npm test
```

---

## Contributing

Chronos-Kit follows the Linux Foundation Decentralized Trust contribution standards.

All commits require a **Developer Certificate of Origin** sign-off:

```bash
git commit -s -m "feat: add support for TokenBurnTransaction in BatchCompiler"
```

GPG-signed commits are also required. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full setup guide including GPG key configuration, branch naming conventions, and the PR checklist.

**License:** Apache 2.0 — see [LICENSE](LICENSE).

---

## Acknowledgements

Built for the [Hedera Hello Future: Apex Hackathon 2026](https://hackathon.stackup.dev/web/events/hedera-hello-future-apex-hackathon2026).

Inspired by the production patterns of [hiero-enterprise-java](https://github.com/OpenElements/hiero-enterprise-java) and the developer experience of [wagmi](https://wagmi.sh/) for the EVM ecosystem.

The Hiero network is an open-source project under the [Linux Foundation Decentralized Trust](https://www.lfdecentralizedtrust.org/).
