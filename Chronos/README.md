# Chronos-Kit

<div align="center">

**Production-ready TypeScript library and React toolkit for intent-based decentralized finance scheduling on Hiero network**

[![CI](https://github.com/YOUR_ORG/chronos-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/chronos-kit/actions/workflows/ci.yml)
[![DCO](https://github.com/YOUR_ORG/chronos-kit/actions/workflows/dco.yml/badge.svg)](https://github.com/YOUR_ORG/chronos-kit/actions/workflows/dco.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/@chronos-kit/core.svg)](https://www.npmjs.com/package/@chronos-kit/core)

</div>

---

## 🌟 Overview

Chronos-Kit is a foundational, intent-based decentralized finance scheduling and settlement routing protocol built on the Hiero network. It provides developers with clean, declarative utilities to harness the power of:

- **Spatial Atomicity** via [HIP-551](https://hips.hedera.com/hip/hip-551) Atomic Batch Transactions
- **Temporal Atomicity** via [HIP-423](https://hips.hedera.com/hip/hip-423) Long-Term Scheduled Transactions

### Key Features

✨ **Zero Smart Contract Friction** - Bypass EVM complexity entirely  
⚛️ **Atomic Batches** - Execute up to 50 transactions atomically (6KB limit)  
⏰ **Scheduled Transactions** - Schedule future payments with cryptographic precision  
🔍 **Pre-Flight Validation** - Prevent costly failure fees before submission  
📊 **Mirror Node Pagination** - Elegant async generators for data fetching  
⚛️ **React Integration** - First-class hooks and Context providers  
📘 **Strict TypeScript** - Fully typed SDK with comprehensive IntelliSense  

---

## 📦 Packages

This is a monorepo containing multiple packages:

| Package | Description | Version |
|---------|-------------|---------|
| [`@chronos-kit/core`](./packages/chronos-core) | Core TypeScript library for Hiero | ![npm](https://img.shields.io/npm/v/@chronos-kit/core) |
| [`@chronos-kit/react`](./packages/chronos-react) | React hooks and providers | ![npm](https://img.shields.io/npm/v/@chronos-kit/react) |

---

## 🚀 Quick Start

### Installation

```bash
# Using pnpm (recommended)
pnpm add @chronos-kit/core @chronos-kit/react

# Using npm
npm install @chronos-kit/core @chronos-kit/react

# Using yarn
yarn add @chronos-kit/core @chronos-kit/react
```

### Basic Usage

#### React Integration

```tsx
import { ChronosProvider, useHieroAccount, useHieroBatch } from '@chronos-kit/react';
import { AccountId, PrivateKey, TransferTransaction, Hbar } from '@hashgraph/sdk';

function App() {
  return (
    <ChronosProvider
      config={{
        network: 'testnet',
        mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
      }}
    >
      <Dashboard />
    </ChronosProvider>
  );
}

function Dashboard() {
  const { balance, isLoading } = useHieroAccount('0.0.12345');
  
  if (isLoading) return <div>Loading balance...</div>;
  
  return (
    <div>
      <h1>Account Balance: {balance} tℏ</h1>
      <BatchTransferButton />
    </div>
  );
}

function BatchTransferButton() {
  const { compileBatch, isCompiling } = useHieroBatch({
    config: {
      nodeAccountId: '0.0.3',
      batchKey: PrivateKey.generate(),
    },
  });

  const handleBatchTransfer = async () => {
    const tx1 = new TransferTransaction()
      .addHbarTransfer('0.0.12345', new Hbar(-10))
      .addHbarTransfer('0.0.67890', new Hbar(10));

    const tx2 = new TransferTransaction()
      .addHbarTransfer('0.0.12345', new Hbar(-5))
      .addHbarTransfer('0.0.11111', new Hbar(5));

    const result = await compileBatch([tx1, tx2], '0.0.12345');
    console.log('Batch compiled:', result);
  };

  return (
    <button onClick={handleBatchTransfer} disabled={isCompiling}>
      {isCompiling ? 'Compiling...' : 'Execute Batch Transfer'}
    </button>
  );
}
```

#### Core TypeScript Usage

```typescript
import { MirrorNodeClient, BatchCompiler } from '@chronos-kit/core';
import { AccountId, PrivateKey } from '@hashgraph/sdk';

// Initialize Mirror Node client
const client = new MirrorNodeClient({
  baseUrl: 'https://testnet.mirrornode.hedera.com',
});

// Fetch account balance
const balance = await client.getAccountBalance('0.0.12345');
console.log(`Balance: ${balance.balance} tinybars`);

// Paginate through transaction history
for await (const transactions of client.paginate(
  '/api/v1/transactions',
  { 'account.id': '0.0.12345' },
  100
)) {
  console.log(`Fetched ${transactions.length} transactions`);
}

// Compile atomic batch
const compiler = new BatchCompiler({
  nodeAccountId: '0.0.3',
  batchKey: PrivateKey.generate(),
});

const result = await compiler.compile([tx1, tx2, tx3], '0.0.12345');
console.log(`Batch size: ${result.totalSize} bytes`);
console.log(`Transaction count: ${result.transactionCount}`);
```

---

## 🏗️ Architecture

### Monorepo Structure

```
chronos-kit/
├── packages/
│   ├── chronos-core/          # Core TypeScript library
│   │   ├── src/
│   │   │   ├── client.ts      # Mirror Node REST client
│   │   │   ├── batch.ts       # HIP-551 Batch Compiler
│   │   │   ├── schedule.ts    # HIP-423 Schedule Manager
│   │   │   ├── types.ts       # Type definitions
│   │   │   ├── utils.ts       # Utility functions
│   │   │   └── errors.ts      # Custom errors
│   │   └── package.json
│   │
│   └── chronos-react/         # React integration
│       ├── src/
│       │   ├── providers/     # Context providers
│       │   ├── hooks/         # React hooks
│       │   └── types.ts       # React types
│       └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml            # Main CI pipeline
│       ├── dco.yml           # DCO enforcement
│       └── release.yml       # Release automation
│
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### Design Principles

1. **Failure Fee Prevention** - Pre-flight validation simulates liquidity constraints
2. **Strict Limits Enforcement** - Maximum 50 transactions, 6KB per batch
3. **No EVM Dependency** - Pure Hiero native operations
4. **Declarative API** - Intent-based programming model
5. **Type Safety** - Comprehensive TypeScript coverage

---

## 🧪 Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git with GPG signing configured

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/chronos-kit.git
cd chronos-kit

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Start development mode
pnpm run dev
```

### Available Scripts

- `pnpm run build` - Build all packages
- `pnpm run dev` - Start development mode with watch
- `pnpm run test` - Run all tests
- `pnpm run test:ci` - Run tests with coverage
- `pnpm run lint` - Lint all packages
- `pnpm run lint:fix` - Fix linting issues
- `pnpm run type-check` - Type check all packages
- `pnpm run format` - Format code with Prettier
- `pnpm run clean` - Clean build artifacts

### Testing with Local Hiero Network

The CI pipeline automatically spins up ephemeral Hiero local nodes using `hedera-local-node`. For local development:

```bash
# Install Hiero local node
npm install -g @hashgraph/hedera-local

# Start local network
hedera start -d

# Run integration tests
HEDERA_NETWORK=local pnpm run test
```

---

## 📖 Documentation

- [Core API Reference](./packages/chronos-core/README.md)
- [React Hooks Guide](./packages/chronos-react/README.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting pull requests.

### Developer Certificate of Origin

All commits **must** be signed off with the Developer Certificate of Origin (DCO):

```bash
git commit -s -m "Your commit message"
```

All commits **must** also be GPG signed:

```bash
git commit -S -m "Your commit message"
```

Or combine both:

```bash
git commit -s -S -m "Your commit message"
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions on setting up GPG signing.

---

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

---

## 🔗 Links

- [Hiero Network](https://hiero.org)
- [HIP-551: Atomic Batch Transactions](https://hips.hedera.com/hip/hip-551)
- [HIP-423: Long-Term Scheduled Transactions](https://hips.hedera.com/hip/hip-423)
- [Hiero SDK](https://github.com/hashgraph/hedera-sdk-js)
- [Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)

---

## 🙏 Acknowledgments

Built with ❤️ for the Hiero community.

Special thanks to the Hiero core team for their work on HIP-551 and HIP-423.

---

<div align="center">

**[Website](https://chronos-kit.dev)** • **[Documentation](https://docs.chronos-kit.dev)** • **[Discord](https://discord.gg/chronos-kit)**

</div>
