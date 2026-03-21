'use client';

import { ChronosProvider } from './ChronosProvider';
import type { HieroNetworkConfig } from '@/lib/types';
import type { ReactNode } from 'react';

const NETWORK_URLS: Record<string, string> = {
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  testnet: 'https://testnet.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

const network = (process.env.NEXT_PUBLIC_HIERO_NETWORK ?? 'testnet') as HieroNetworkConfig['network'];
const mirrorNodeUrl =
  process.env.NEXT_PUBLIC_HIERO_MIRROR_NODE_URL ?? NETWORK_URLS[network] ?? NETWORK_URLS.testnet;

const defaultConfig: HieroNetworkConfig = { network, mirrorNodeUrl };

export function Providers({ children }: { children: ReactNode }) {
  return <ChronosProvider config={defaultConfig}>{children}</ChronosProvider>;
}
