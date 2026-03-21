'use client';

import {
  AccountId,
  Client,
  PrivateKey,
} from '@hashgraph/sdk';
import { useChronos } from '@/components/providers/ChronosProvider';
import { useEffect, useRef, useState } from 'react';

type HederaNetwork = 'mainnet' | 'testnet';

export interface UseHieroAccountResult {
  client: Client | null;
  accountId: string | null;
  isReady: boolean;
  error: Error | null;
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
  const client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

  client.setOperator(operatorId, operatorKey);
  client.setMaxAttempts(5);
  client.setRequestTimeout(30_000);

  return client;
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
        const operatorKey = parseOperatorKey(process.env.NEXT_PUBLIC_OPERATOR_KEY);
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
