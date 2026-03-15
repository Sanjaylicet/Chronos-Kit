/**
 * Core type definitions for Chronos-Kit
 */

import type { AccountId, Transaction, TransactionId, PrivateKey } from '@hashgraph/sdk';

/**
 * Configuration for the Hiero network connection
 */
export interface HieroNetworkConfig {
  /** Network identifier: mainnet, testnet, previewnet, or custom */
  network: 'mainnet' | 'testnet' | 'previewnet' | 'custom';
  /** Mirror node REST API base URL */
  mirrorNodeUrl: string;
  /** Optional custom node configuration for consensus nodes */
  nodes?: Record<string, AccountId | string>;
}

/**
 * Atomic Batch Transaction configuration (HIP-551)
 */
export interface BatchTransactionConfig {
  /** Node account ID to execute the batch */
  nodeAccountId: AccountId | string;
  /** Private key for batch signing (batchKey) */
  batchKey: PrivateKey;
  /** Maximum allowed batch size in bytes (default: 6144 = 6KB) */
  maxBatchSize?: number;
  /** Maximum allowed transaction count (default: 50) */
  maxTransactionCount?: number;
}

/**
 * Scheduled Transaction configuration (HIP-423)
 */
export interface ScheduleTransactionConfig {
  /** Payer account for the scheduled transaction */
  payerAccountId: AccountId | string;
  /** Optional admin key for schedule management */
  adminKey?: PrivateKey;
  /** Optional expiration time for the schedule */
  expirationTime?: Date;
  /** Whether to wait for expiry (default: false) */
  waitForExpiry?: boolean;
}

/**
 * Account balance information from Mirror Node
 */
export interface AccountBalance {
  /** Account identifier */
  account: string;
  /** HBAR balance in tinybars */
  balance: number;
  /** Token balances */
  tokens?: TokenBalance[];
  /** Timestamp of balance */
  timestamp: string;
}

/**
 * Token balance information
 */
export interface TokenBalance {
  /** Token ID */
  token_id: string;
  /** Balance amount */
  balance: number;
  /** Number of decimals */
  decimals?: number;
}

/**
 * Mirror Node pagination response
 */
export interface MirrorNodeResponse<T> {
  /** Pagination links */
  links: {
    next: string | null;
  };
  /** Data items - can be any key */
  [key: string]: T[] | { next: string | null };
}

/**
 * Transaction history item from Mirror Node
 */
export interface TransactionHistoryItem {
  /** Consensus timestamp */
  consensus_timestamp: string;
  /** Transaction ID */
  transaction_id: string;
  /** Transaction type */
  name: string;
  /** Result status */
  result: string;
  /** Charged transaction fee */
  charged_tx_fee: number;
  /** Transaction memo */
  memo_base64?: string;
}

/**
 * Pre-flight validation result
 */
export interface PreFlightValidationResult {
  success: boolean;
  error?: string;
  estimatedFee?: number;
  accountBalance?: number;
  checks: {
    sufficientBalance: boolean;
    validBatchSize: boolean;
    validTransactionCount: boolean;
    nodeAccountValid: boolean;
  };
}

/**
 * Batch compilation result
 */
export interface BatchCompilationResult {
  transaction: Transaction;
  totalSize: number;
  transactionCount: number;
  transactionId: TransactionId;
  estimatedFee: number;
}

/**
 * Constants for Hiero network limits
 */
export const HIERO_LIMITS = {
  /** Maximum batch size in bytes (6KB) */
  MAX_BATCH_SIZE: 6144,
  /** Maximum inner transactions per batch */
  MAX_BATCH_TRANSACTIONS: 50,
  /** Default Mirror Node pagination limit */
  DEFAULT_PAGE_SIZE: 100,
} as const;

// ─── Mirror Node API Response Types ──────────────────────────────────────────

export interface MirrorNodeKey {
  _type: 'ED25519' | 'ECDSA_SECP256K1' | 'ProtobufEncoded';
  key: string;
}

export interface MirrorNodeAccountBalanceSnapshot {
  balance: number;
  timestamp: string;
  tokens: Array<{ token_id: string; balance: number }>;
}

export interface MirrorNodeAccountInfo {
  account: string;
  auto_renew_period: number | null;
  balance: MirrorNodeAccountBalanceSnapshot;
  created_timestamp: string | null;
  decline_reward: boolean;
  deleted: boolean;
  ethereum_nonce: number;
  evm_address: string;
  expiry_timestamp: string | null;
  key: MirrorNodeKey | null;
  max_automatic_token_associations: number;
  memo: string;
  pending_reward: number;
  receiver_sig_required: boolean;
  staked_account_id: string | null;
  staked_node_id: number | null;
  stake_period_start: string | null;
}

export interface MirrorNodeTransfer {
  account: string;
  amount: number;
  is_approval: boolean;
}

export interface MirrorNodeTokenTransfer {
  token_id: string;
  account: string;
  amount: number;
  is_approval: boolean;
}

export interface MirrorNodeNftTransfer {
  token_id: string;
  serial_number: number;
  sender_account_id: string | null;
  receiver_account_id: string | null;
  is_approval: boolean;
}

export interface MirrorNodeTransaction {
  bytes: string | null;
  charged_tx_fee: number;
  consensus_timestamp: string;
  entity_id: string | null;
  max_fee: string;
  memo_base64: string;
  name: string;
  nft_transfers: MirrorNodeNftTransfer[];
  node: string | null;
  nonce: number;
  parent_consensus_timestamp: string | null;
  result: string;
  scheduled: boolean;
  staking_reward_transfers: MirrorNodeTransfer[];
  token_transfers: MirrorNodeTokenTransfer[];
  transaction_hash: string;
  transaction_id: string;
  transfers: MirrorNodeTransfer[];
  valid_duration_seconds: string;
  valid_start_timestamp: string;
}

export interface MirrorNodeFixedFee {
  amount: number;
  collector_account_id: string;
  denominating_token_id: string | null;
}

export interface MirrorNodeFractionalFee {
  amount: { numerator: number; denominator: number };
  collector_account_id: string;
  denominating_token_id: string | null;
  maximum: number | null;
  minimum: number;
  net_of_transfers: boolean;
}

export interface MirrorNodeRoyaltyFee {
  amount: { numerator: number; denominator: number };
  collector_account_id: string;
  fallback_fee: MirrorNodeFixedFee | null;
}

export interface MirrorNodeCustomFees {
  created_timestamp: string;
  fixed_fees: MirrorNodeFixedFee[];
  fractional_fees: MirrorNodeFractionalFee[];
  royalty_fees: MirrorNodeRoyaltyFee[];
}

export interface MirrorNodeTokenInfo {
  admin_key: MirrorNodeKey | null;
  auto_renew_account: string | null;
  auto_renew_period: number | null;
  created_timestamp: string;
  custom_fees: MirrorNodeCustomFees;
  decimals: string;
  deleted: boolean;
  expiry_timestamp: string | null;
  freeze_default: boolean;
  freeze_key: MirrorNodeKey | null;
  initial_supply: string;
  kyc_key: MirrorNodeKey | null;
  max_supply: string;
  memo: string;
  modified_timestamp: string;
  name: string;
  pause_key: MirrorNodeKey | null;
  pause_status: 'PAUSED' | 'UNPAUSED' | 'NOT_APPLICABLE';
  supply_key: MirrorNodeKey | null;
  supply_type: 'FINITE' | 'INFINITE';
  symbol: string;
  token_id: string;
  total_supply: string;
  treasury_account_id: string;
  type: 'FUNGIBLE_COMMON' | 'NON_FUNGIBLE_UNIQUE';
  wipe_key: MirrorNodeKey | null;
}

export interface MirrorNodeTokenBalance {
  account: string;
  balance: number;
  decimals: number;
}

export interface MirrorNodeScheduleSignature {
  consensus_timestamp: string;
  public_key_prefix: string;
  signature: string;
  type: string;
}

export interface MirrorNodeScheduleInfo {
  admin_key: MirrorNodeKey | null;
  consensus_timestamp: string | null;
  creator_account_id: string;
  deleted: boolean;
  executed_timestamp: string | null;
  expiration_time: string | null;
  memo: string;
  payer_account_id: string;
  schedule_id: string;
  signatures: MirrorNodeScheduleSignature[];
  transaction_body: string;
  wait_for_expiry: boolean;
}

export interface MirrorNodeNftInfo {
  account_id: string;
  created_timestamp: string;
  delegating_spender: string | null;
  deleted: boolean;
  metadata: string;
  modified_timestamp: string;
  serial_number: number;
  spender: string | null;
  token_id: string;
}

export interface MirrorNodeTokenRelationship {
  automatic_association: boolean;
  balance: number;
  created_timestamp: string | null;
  decimals: number;
  freeze_status: 'FROZEN' | 'UNFROZEN' | 'NOT_APPLICABLE';
  kyc_status: 'GRANTED' | 'REVOKED' | 'NOT_APPLICABLE';
  token_id: string;
}

export interface PaginateOptions {
  pageSize?: number;
  maxItems?: number;
  params?: Record<string, string | number | boolean>;
}
