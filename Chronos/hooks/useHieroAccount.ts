'use client';

import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  Status,
  type Hbar,
} from '@hashgraph/sdk';
import { useChronos } from '@/components/providers/ChronosProvider';
import { useEffect, useRef, useState } from 'react';

type HederaNetwork = 'mainnet' | 'testnet';

const NODES: Record<HederaNetwork, Array<Record<string, string>>> = {
  mainnet: [
    { '0.mainnet.hedera.com:50211': '0.0.3' },
    { '1.mainnet.hedera.com:50211': '0.0.4' },
    { '2.mainnet.hedera.com:50211': '0.0.5' },
  ],
  testnet: [
    { '0.testnet.hedera.com:50211': '0.0.3' },
    { '1.testnet.hedera.com:50211': '0.0.4' },
    { '2.testnet.hedera.com:50211': '0.0.5' },
  ],
};

const NODE_CHECK_TIMEOUT_MS = 3_000;
const MAX_NODE_ATTEMPTS = 3;

export interface UseHieroAccountResult {
  client: Client | null;
  accountId: string | null;
  isReady: boolean;
  error: Error | null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function isRetryableNodeError(error: unknown): boolean {
  if (error instanceof Error && error.message.includes('Timed out')) {
    return true;
  }

  const maybeStatus = (error as { status?: Status })?.status;
  if (maybeStatus === Status.InvalidNodeAccount) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes('INVALID_NODE_ACCOUNT');
}

function parseNetwork(value: string | undefined): HederaNetwork {
  if (value === 'mainnet' || value === 'testnet') {
    return value;
  }
  throw new Error('NEXT_PUBLIC_HEDERA_NETWORK must be set to "mainnet" or "testnet"');
}

function parseOperatorKey(value: string | undefined): PrivateKey {
  if (!value) {
    throw new Error('OPERATOR_KEY is required');
  }

  try {
    return PrivateKey.fromStringECDSA(value);
  } catch {
    try {
      return PrivateKey.fromStringED25519(value);
    } catch {
      throw new Error('OPERATOR_KEY is invalid');
    }
  }
}

async function initializeClient(
  network: HederaNetwork,
  operatorId: AccountId,
  operatorKey: PrivateKey
): Promise<Client> {
  const nodes = NODES[network];

  for (let attempt = 0; attempt < Math.min(MAX_NODE_ATTEMPTS, nodes.length); attempt += 1) {
    const node = nodes[attempt];
    const client = Client.forNetwork(node);
    client.setOperator(operatorId, operatorKey);

    try {
      await withTimeout(
        new AccountBalanceQuery()
          .setAccountId(operatorId)
          .execute(client) as Promise<Hbar | { hbars: Hbar }>,
        NODE_CHECK_TIMEOUT_MS
      );
      return client;
    } catch (error: unknown) {
      client.close();

      if (!isRetryableNodeError(error) || attempt === MAX_NODE_ATTEMPTS - 1) {
        throw error instanceof Error ? error : new Error('Failed to initialize Hiero client');
      }
    }
  }

  throw new Error('Failed to initialize Hiero client');
}

export function useHieroAccount(): UseHieroAccountResult {
  const { setClient } = useChronos();
  const [client, setLocalClient] = useState<Client | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);
  const activeClientRef = useRef<Client | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        setError(null);
        setIsReady(false);

        const network = parseNetwork(process.env.NEXT_PUBLIC_HEDERA_NETWORK);
        const operatorIdValue = process.env.NEXT_PUBLIC_OPERATOR_ID;

        if (!operatorIdValue) {
          throw new Error('NEXT_PUBLIC_OPERATOR_ID is required');
        }

        const operatorId = AccountId.fromString(operatorIdValue);
        const operatorKey = parseOperatorKey(process.env.OPERATOR_KEY);
        const initializedClient = await initializeClient(network, operatorId, operatorKey);

        if (cancelled) {
          initializedClient.close();
          return;
        }

        activeClientRef.current?.close();
        activeClientRef.current = initializedClient;

        setLocalClient(initializedClient);
        setClient(initializedClient);
        setAccountId(operatorId.toString());
        setIsReady(true);
      } catch (setupError: unknown) {
        if (cancelled) {
          return;
        }

        const resolvedError =
          setupError instanceof Error ? setupError : new Error('Failed to initialize Hiero account');
        setError(resolvedError);
        setLocalClient(null);
        setClient(null);
        setAccountId(null);
        setIsReady(false);
      }
    };

    void setup();

    return () => {
      cancelled = true;
      activeClientRef.current?.close();
      activeClientRef.current = null;
      setClient(null);
    };
  }, [setClient]);

  return {
    client,
    accountId,
    isReady,
    error,
  };
}
