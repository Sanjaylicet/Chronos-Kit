# Chronos-Kit

![CI](https://img.shields.io/badge/CI-passing-brightgreen)
![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![npm version](https://img.shields.io/npm/v/chronos-kit)

Chronos-Kit is a Next.js-first toolkit for building batched and scheduled Hiero transactions with strong pre-flight validation, React hooks for app integration, and provider-based network wiring so teams can ship ledger workflows quickly while keeping transaction safety and ergonomics high.

## Environment Variables

| Variable | Description | Example value |
| --- | --- | --- |
| `NEXT_PUBLIC_MIRROR_NODE_URL` | Base URL for the Hiero mirror node used by API and pre-flight checks. | `https://testnet.mirrornode.hedera.com/api/v1` |
| `NEXT_PUBLIC_HEDERA_NETWORK` | Target Hiero network for SDK client initialization (`testnet` or `mainnet`). | `testnet` |
| `NEXT_PUBLIC_OPERATOR_ID` | Operator account ID used as payer/signer account context. | `0.0.1001` |
| `OPERATOR_KEY` | Private key for the operator account used for signing transactions. | `302e020100300506032b657004220420aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` |

## Quickstart

```bash
npm install
npm run dev
```

## Next.js Usage Example (20 lines)

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
    await submitBatch(transactions, plan);
    await scheduleFor(transactions, plan, new Date(Date.now() + 3_600_000), 'hourly-run');
  };
  return <button onClick={() => void run()}>Run Chronos</button>;
}
export default function Page() {
  return <ChronosProvider config={config}><Actions /></ChronosProvider>;
}
```

## Demo

Live demo: [/demo](/demo)
