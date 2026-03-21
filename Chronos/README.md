# Chronos-Kit

[![CI](https://github.com/Sanjaylicet/Chronos-Kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Sanjaylicet/Chronos-Kit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](./LICENSE)
[![npm version](https://img.shields.io/npm/v/chronos-kit)](https://www.npmjs.com/package/chronos-kit)

Chronos-Kit is a Next.js-first TypeScript library and integration toolkit for the **Hiero ledger**. It implements **[HIP-551](https://hips.hedera.com/hip/hip-551) atomic batch transactions** and **[HIP-423](https://hips.hedera.com/hip/hip-423) long-term scheduled transactions**, combining both into a single ergonomic API with built-in pre-flight validation, React hooks, and provider-based network wiring so teams can ship ledger workflows quickly while keeping transaction safety and costs under control.

## Environment Variables

| Variable | Description | Example value |
| --- | --- | --- |
| `NEXT_PUBLIC_MIRROR_NODE_URL` | Base URL for the Hiero mirror node used by API and pre-flight checks. | `https://testnet.mirrornode.hedera.com/api/v1` |
| `NEXT_PUBLIC_HEDERA_NETWORK` | Target Hiero network for SDK client initialization (`testnet` or `mainnet`). | `testnet` |
| `NEXT_PUBLIC_OPERATOR_ID` | Operator account ID used as payer/signer account context. | `0.0.1001` |
| `NEXT_PUBLIC_OPERATOR_KEY` | Private key for the operator account used for signing transactions. | `302e020100300506032b657004220420...` |

## Quickstart

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to [/demo](/demo) for the full DAO payroll walkthrough.

## Next.js Usage Example

```tsx
'use client';
import { ChronosProvider } from '@/components/providers/ChronosProvider';
import { useHieroBatch } from '@/hooks/useHieroBatch';
import { useHieroSchedule } from '@/hooks/useHieroSchedule';
import type { Transaction } from '@hashgraph/sdk';

const config = { network: 'testnet', mirrorNodeUrl: process.env.NEXT_PUBLIC_MIRROR_NODE_URL! };

function Actions() {
  const { submitBatch } = useHieroBatch();
  const { scheduleFor } = useHieroSchedule();
  const run = async () => {
    const transactions: Transaction[] = [];
    const plan = { payerAccountId: '0.0.1001', innerTransactions: transactions, tokenTransfers: [] };
    // HIP-551: atomic batch — auto-chunked, pre-flight validated
    await submitBatch(transactions, plan);
    // HIP-423: long-term schedule — runs one hour from now
    await scheduleFor(transactions, plan, new Date(Date.now() + 3_600_000), 'hourly-run');
  };
  return <button onClick={() => void run()}>Run Chronos</button>;
}

export default function Page() {
  return <ChronosProvider config={config}><Actions /></ChronosProvider>;
}
```

## Demo

Interactive DAO monthly payroll demo: [/demo](/demo)

## License

Apache 2.0 — see [LICENSE](./LICENSE).
