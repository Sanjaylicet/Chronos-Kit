/**
 * Mirror Node REST API client with pagination support
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

import { MirrorNodeError } from './errors';
import { HIERO_LIMITS } from './types';
import type {
  AccountBalance,
  MirrorNodeResponse,
  TransactionHistoryItem,
} from './types';

export interface MirrorNodeClientConfig {
  /** Base URL for Mirror Node REST API */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Mirror Node REST API client
 * Provides strongly-typed access to Hiero Mirror Node data
 */
export class MirrorNodeClient {
  private readonly client: AxiosInstance;

  constructor(config: MirrorNodeClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const message =
          (error.response?.data as { message?: string })?.message ??
          error.message;
        const statusCode = error.response?.status;
        throw new MirrorNodeError(message, statusCode);
      }
    );
  }

  /**
   * Get account balance for a specific account
   */
  async getAccountBalance(accountId: string): Promise<AccountBalance> {
    const response = await this.client.get<{ balances: AccountBalance[] }>(
      `/api/v1/balances`,
      {
        params: { 'account.id': accountId },
      }
    );

    const balance = response.data.balances[0];
    if (!balance) {
      throw new MirrorNodeError(`Account ${accountId} not found`, 404);
    }

    return balance;
  }

  /**
   * Get transaction history for an account with pagination
   */
  async getTransactionHistory(
    accountId: string,
    limit?: number
  ): Promise<TransactionHistoryItem[]> {
    const allTransactions: TransactionHistoryItem[] = [];

    for await (const page of this.paginate<TransactionHistoryItem>(
      `/api/v1/transactions`,
      { 'account.id': accountId },
      limit
    )) {
      allTransactions.push(...page);
    }

    return allTransactions;
  }

  /**
   * Advanced async generator for Mirror Node pagination
   * Completely abstracts links.next cursor resolution
   * Neutralizes the N+1 query problem
   */
  async *paginate<T>(
    endpoint: string,
    params: Record<string, string> = {},
    limit?: number
  ): AsyncGenerator<T[], void, undefined> {
    let nextUrl: string | null = endpoint;
    let itemsYielded = 0;
    const pageLimit = limit ?? HIERO_LIMITS.DEFAULT_PAGE_SIZE;

    while (nextUrl) {
      // Fetch current page
      const response: { data: MirrorNodeResponse<T> } = await this.client.get<MirrorNodeResponse<T>>(nextUrl, {
        params: nextUrl === endpoint ? { ...params, limit: pageLimit } : undefined,
      });

      // Extract data items (first key that's an array)
      const dataKey = Object.keys(response.data).find(
        (key) => Array.isArray(response.data[key])
      );

      if (!dataKey) {
        break;
      }

      const items = response.data[dataKey] as T[];

      if (items.length === 0) {
        break;
      }

      // Check if we need to slice items based on limit
      if (limit !== undefined) {
        const remaining = limit - itemsYielded;
        if (remaining <= 0) {
          break;
        }

        const itemsToYield = items.slice(0, remaining);
        yield itemsToYield;
        itemsYielded += itemsToYield.length;

        if (itemsYielded >= limit) {
          break;
        }
      } else {
        yield items;
      }

      // Get next page URL
      nextUrl = response.data.links?.next ?? null;

      // If nextUrl is relative, make it absolute
      if (nextUrl && !nextUrl.startsWith('http')) {
        nextUrl = nextUrl.startsWith('/') ? nextUrl : `/${nextUrl}`;
      }
    }
  }

  /**
   * Verify if an account exists on the network
   */
  async accountExists(accountId: string): Promise<boolean> {
    try {
      await this.getAccountBalance(accountId);
      return true;
    } catch (error) {
      if (error instanceof MirrorNodeError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get account info from Mirror Node
   */
  async getAccountInfo(accountId: string): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/api/v1/accounts/${accountId}`);
    return response.data as Record<string, unknown>;
  }
}
