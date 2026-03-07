/**
 * Type definitions for React integration
 */

import { HieroNetworkConfig } from '@chronos-kit/core';
import { ReactNode } from 'react';

/**
 * Props for ChronosProvider
 */
export interface ChronosProviderProps {
  /** Network configuration */
  config: HieroNetworkConfig;
  /** Child components */
  children: ReactNode;
}

/**
 * Props for HieroAccountProvider
 */
export interface HieroAccountProviderProps {
  /** Account ID to track */
  accountId: string;
  /** Child components */
  children: ReactNode;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
}

/**
 * Account state from hook
 */
export interface HieroAccountState {
  /** Account ID */
  accountId: string;
  /** Account balance in tinybars */
  balance: number | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
}
