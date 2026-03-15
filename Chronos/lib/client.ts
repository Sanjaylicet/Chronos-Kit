/**
 * @fileoverview Mirror Node REST API client.
 *
 * Provides:
 *  - Strongly-typed wrappers for every Chronos-relevant Mirror Node endpoint
 *  - paginate() async-generator that abstracts the links.next cursor chain
 *  - Exponential back-off on HTTP 429 (rate-limit) with configurable retries
 *  - SSRF-safe next-URL validation to block DNS-rebinding / redirect attacks
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

import { MirrorNodeError } from './errors';
import { HIERO_LIMITS } from './types';
import type {
  AccountBalance,
  MirrorNodeResponse,
  MirrorNodeAccountInfo,
  MirrorNodeTransaction,
  MirrorNodeTokenInfo,
  MirrorNodeTokenBalance,
  MirrorNodeScheduleInfo,
  MirrorNodeNftInfo,
  MirrorNodeTokenRelationship,
  PaginateOptions,
} from './types';

const RETRY_BASE_DELAY_MS = 500;

export interface MirrorNodeClientConfig {
  /** Base URL for Mirror Node REST API */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 10 000) */
  timeout?: number;
  /** Custom HTTP headers added to every request */
  headers?: Record<string, string>;
  /** Maximum retries on HTTP 429 responses (default: 3) */
  maxRetries?: number;
  /** @internal Inject a pre-built AxiosInstance — for unit tests only. */
  _httpClient?: AxiosInstance;
}

export class MirrorNodeClient {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly maxRetries: number;

  constructor(config: MirrorNodeClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.maxRetries = config.maxRetries ?? 3;

    if (config._httpClient) {
      this.client = config._httpClient;
    } else {
      this.client = axios.create({
        baseURL: this.baseUrl,
        timeout: config.timeout ?? 10_000,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      });

      this.client.interceptors.response.use(
        (response) => response,
        (error: AxiosError) => {
          const mirrorMsg = (
            error.response?.data as {
              _status?: { messages?: Array<{ message?: string }> };
            }
          )?._status?.messages?.[0]?.message;

          const message =
            mirrorMsg ??
            (error.response?.data as { message?: string })?.message ??
            error.message;

          const statusCode = error.response?.status;
          throw new MirrorNodeError(message, statusCode);
        }
      );
    }
  }

  private isSafeNextUrl(nextUrl: string): boolean {
    if (nextUrl.startsWith('/')) return true;
    try {
      const parsedNext = new URL(nextUrl);
      const parsedBase = new URL(this.baseUrl);
      return parsedNext.hostname === parsedBase.hostname;
    } catch {
      return false;
    }
  }

  private async getWithRetry<T>(
    url: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const response = await this.client.get<T>(url, params ? { params } : undefined);
        return response.data;
      } catch (error) {
        if (
          error instanceof MirrorNodeError &&
          error.statusCode === 429 &&
          attempt < this.maxRetries
        ) {
          const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
          attempt++;
          continue;
        }
        throw error;
      }
    }
  }

  async getAccountBalance(accountId: string): Promise<AccountBalance> {
    const data = await this.getWithRetry<{ balances: AccountBalance[] }>(
      '/api/v1/balances',
      { 'account.id': accountId }
    );

    const balance = data.balances[0];
    if (!balance) {
      throw new MirrorNodeError(`Account ${accountId} not found`, 404);
    }

    return balance;
  }

  async getAccountInfo(accountId: string): Promise<MirrorNodeAccountInfo> {
    return this.getWithRetry<MirrorNodeAccountInfo>(`/api/v1/accounts/${accountId}`);
  }

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

  getAccountTokenRelationships(
    accountId: string,
    options?: Omit<PaginateOptions, 'params'>
  ): AsyncGenerator<MirrorNodeTokenRelationship[], void, undefined> {
    return this.paginate<MirrorNodeTokenRelationship>(
      `/api/v1/accounts/${accountId}/tokens`,
      options
    );
  }

  async getTransactionHistory(
    accountId: string,
    options?: { limit?: number; pageSize?: number }
  ): Promise<MirrorNodeTransaction[]> {
    const all: MirrorNodeTransaction[] = [];

    for await (const page of this.paginate<MirrorNodeTransaction>(
      '/api/v1/transactions',
      {
        params: { 'account.id': accountId },
        pageSize: options?.pageSize,
        maxItems: options?.limit,
      }
    )) {
      all.push(...page);
    }

    return all;
  }

  async getTransactionById(transactionId: string): Promise<MirrorNodeTransaction> {
    const data = await this.getWithRetry<{ transactions: MirrorNodeTransaction[] }>(
      `/api/v1/transactions/${transactionId}`
    );

    const tx = data.transactions[0];
    if (!tx) {
      throw new MirrorNodeError(`Transaction ${transactionId} not found`, 404);
    }

    return tx;
  }

  async getTokenInfo(tokenId: string): Promise<MirrorNodeTokenInfo> {
    return this.getWithRetry<MirrorNodeTokenInfo>(`/api/v1/tokens/${tokenId}`);
  }

  getTokenBalances(
    tokenId: string,
    options?: Omit<PaginateOptions, 'params'>
  ): AsyncGenerator<MirrorNodeTokenBalance[], void, undefined> {
    return this.paginate<MirrorNodeTokenBalance>(
      `/api/v1/tokens/${tokenId}/balances`,
      options
    );
  }

  async getNftInfo(tokenId: string, serialNumber: number): Promise<MirrorNodeNftInfo> {
    return this.getWithRetry<MirrorNodeNftInfo>(
      `/api/v1/tokens/${tokenId}/nfts/${serialNumber}`
    );
  }

  async getScheduleInfo(scheduleId: string): Promise<MirrorNodeScheduleInfo> {
    return this.getWithRetry<MirrorNodeScheduleInfo>(`/api/v1/schedules/${scheduleId}`);
  }

  async *paginate<T>(
    endpoint: string,
    options?: PaginateOptions
  ): AsyncGenerator<T[], void, undefined> {
    const pageSize = options?.pageSize ?? HIERO_LIMITS.DEFAULT_PAGE_SIZE;
    const maxItems = options?.maxItems;
    const extraParams = options?.params ?? {};

    let nextUrl: string | null = endpoint;
    let isFirstPage = true;
    let totalYielded = 0;

    while (nextUrl) {
      const requestParams = isFirstPage
        ? { ...extraParams, limit: pageSize }
        : undefined;

      const data: MirrorNodeResponse<T> = await this.getWithRetry<MirrorNodeResponse<T>>(
        nextUrl,
        requestParams
      );

      isFirstPage = false;

      const dataKey = Object.keys(data).find((key) => Array.isArray(data[key]));
      if (!dataKey) break;

      const items = data[dataKey] as T[];
      if (items.length === 0) break;

      if (maxItems !== undefined) {
        const remaining = maxItems - totalYielded;
        if (remaining <= 0) break;

        const slice = items.slice(0, remaining);
        yield slice;
        totalYielded += slice.length;

        if (totalYielded >= maxItems) break;
      } else {
        yield items;
        totalYielded += items.length;
      }

      const rawNext: string | null = data.links?.next ?? null;
      if (!rawNext) break;

      if (!this.isSafeNextUrl(rawNext)) {
        throw new MirrorNodeError(
          `Unsafe links.next URL "${rawNext}" blocked to prevent SSRF. ` +
            `Expected host: ${new URL(this.baseUrl).hostname}`
        );
      }

      nextUrl = rawNext.startsWith('http')
        ? new URL(rawNext).pathname + new URL(rawNext).search
        : rawNext;
    }
  }
}
