import axios, { AxiosError, AxiosInstance } from 'axios';

import { MirrorNodeError, SSRFBlockedError } from './errors';

type QueryParams = Record<string, string>;

const RETRY_MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 300;
const RETRY_JITTER_MS = 100;

export interface AccountInfo {
  account: string;
  alias?: string | null;
  auto_renew_period: number | null;
  balance: {
    balance: number;
    timestamp: string;
    tokens?: TokenBalance[];
  };
  created_timestamp: string | null;
  decline_reward: boolean;
  deleted: boolean;
  ethereum_nonce: number;
  evm_address: string;
  expiry_timestamp: string | null;
  key: {
    _type: string;
    key: string;
  } | null;
  max_automatic_token_associations: number;
  memo: string;
  pending_reward: number;
  receiver_sig_required: boolean;
  staked_account_id: string | null;
  staked_node_id: number | null;
  stake_period_start: string | null;
}

export interface TokenBalance {
  automatic_association: boolean;
  balance: number;
  created_timestamp: string | null;
  decimals: number;
  freeze_status: 'FROZEN' | 'UNFROZEN' | 'NOT_APPLICABLE';
  kyc_status: 'GRANTED' | 'REVOKED' | 'NOT_APPLICABLE';
  token_id: string;
}

export interface Transaction {
  bytes: string | null;
  charged_tx_fee: number;
  consensus_timestamp: string;
  entity_id: string | null;
  max_fee: string;
  memo_base64: string;
  name: string;
  nft_transfers: Array<{
    token_id: string;
    serial_number: number;
    sender_account_id: string | null;
    receiver_account_id: string | null;
    is_approval: boolean;
  }>;
  node: string | null;
  nonce: number;
  parent_consensus_timestamp: string | null;
  result: string;
  scheduled: boolean;
  staking_reward_transfers: Array<{
    account: string;
    amount: number;
    is_approval: boolean;
  }>;
  token_transfers: Array<{
    token_id: string;
    account: string;
    amount: number;
    is_approval: boolean;
  }>;
  transaction_hash: string;
  transaction_id: string;
  transfers: Array<{
    account: string;
    amount: number;
    is_approval: boolean;
  }>;
  valid_duration_seconds: string;
  valid_start_timestamp: string;
}

export interface ScheduleInfo {
  admin_key: {
    _type: string;
    key: string;
  } | null;
  consensus_timestamp: string | null;
  creator_account_id: string;
  deleted: boolean;
  executed_timestamp: string | null;
  expiration_time: string | null;
  memo: string;
  payer_account_id: string;
  schedule_id: string;
  signatures: Array<{
    consensus_timestamp: string;
    public_key_prefix: string;
    signature: string;
    type: string;
  }>;
  transaction_body: string;
  wait_for_expiry: boolean;
}

interface PaginatedMirrorResponse<T> {
  links?: {
    next?: string | null;
  };
  [key: string]: unknown;
}

export interface MirrorNodeClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  axiosInstance?: AxiosInstance;
}

export class MirrorNodeClient {
  private readonly baseUrl: string;
  private readonly baseHost: string;
  private readonly client: AxiosInstance;
  private readonly ssrfCheckPromise: Promise<void>;

  constructor(config: MirrorNodeClientConfig = {}) {
    const envBaseUrl = process.env.NEXT_PUBLIC_MIRROR_NODE_URL;
    const configuredBaseUrl = (config.baseUrl ?? envBaseUrl ?? '').trim();

    if (!configuredBaseUrl) {
      throw new MirrorNodeError(
        'Missing mirror node base URL. Set NEXT_PUBLIC_MIRROR_NODE_URL or pass baseUrl.',
        undefined,
        '/'
      );
    }

    this.baseUrl = configuredBaseUrl.replace(/\/$/, '');

    let parsed: URL;
    try {
      parsed = new URL(this.baseUrl);
    } catch {
      throw new MirrorNodeError(`Invalid mirror node URL: ${this.baseUrl}`, undefined, '/');
    }

    this.baseHost = parsed.hostname;
    this.client =
      config.axiosInstance ??
      axios.create({
        baseURL: this.baseUrl,
        timeout: config.timeoutMs ?? 10_000,
      });

    this.ssrfCheckPromise = this.assertSafeMirrorNodeHost();
  }

  async *paginate<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<T, void, unknown> {
    let nextPath: string | null = path;
    let nextParams: QueryParams | undefined = params;

    while (nextPath) {
      const response = await this.get<PaginatedMirrorResponse<T>>(nextPath, nextParams);
      const items = this.extractItems<T>(response);

      for (const item of items) {
        yield item;
      }

      const rawNext = response.links?.next;
      if (!rawNext) {
        break;
      }

      nextPath = this.normalizeNextPath(rawNext);
      nextParams = undefined;
    }
  }

  async getAccountInfo(accountId: string): Promise<AccountInfo> {
    return this.get<AccountInfo>(`/api/v1/accounts/${encodeURIComponent(accountId)}`);
  }

  async getAccountTokens(accountId: string): Promise<TokenBalance[]> {
    const tokenBalances: TokenBalance[] = [];

    for await (const token of this.paginate<TokenBalance>(
      `/api/v1/accounts/${encodeURIComponent(accountId)}/tokens`
    )) {
      tokenBalances.push(token);
    }

    return tokenBalances;
  }

  async getTransactions(accountId: string): Promise<Transaction[]> {
    const transactions: Transaction[] = [];

    for await (const transaction of this.paginate<Transaction>('/api/v1/transactions', {
      'account.id': accountId,
    })) {
      transactions.push(transaction);
    }

    return transactions;
  }

  async getScheduleInfo(scheduleId: string): Promise<ScheduleInfo> {
    return this.get<ScheduleInfo>(`/api/v1/schedules/${encodeURIComponent(scheduleId)}`);
  }

  async verifyHbarBalance(
    accountId: string,
    requiredTinybars: bigint
  ): Promise<boolean> {
    const accountInfo = await this.getAccountInfo(accountId);
    return BigInt(accountInfo.balance.balance) >= requiredTinybars;
  }

  async verifyTokenAssociation(accountId: string, tokenId: string): Promise<boolean> {
    const tokenBalances = await this.getAccountTokens(accountId);
    return tokenBalances.some((token) => token.token_id === tokenId);
  }

  async checkFreezeFlag(accountId: string, tokenId: string): Promise<boolean> {
    const tokenBalances = await this.getAccountTokens(accountId);
    const token = tokenBalances.find((item) => item.token_id === tokenId);

    if (!token) {
      return false;
    }

    return token.freeze_status === 'UNFROZEN' || token.freeze_status === 'NOT_APPLICABLE';
  }

  async checkKycGranted(accountId: string, tokenId: string): Promise<boolean> {
    const tokenBalances = await this.getAccountTokens(accountId);
    const token = tokenBalances.find((item) => item.token_id === tokenId);

    if (!token) {
      return false;
    }

    return token.kyc_status === 'GRANTED' || token.kyc_status === 'NOT_APPLICABLE';
  }

  async getAccountBalance(accountId: string): Promise<{
    account: string;
    balance: number;
    timestamp: string;
    tokens?: TokenBalance[];
  }> {
    const accountInfo = await this.getAccountInfo(accountId);

    return {
      account: accountInfo.account,
      balance: accountInfo.balance.balance,
      timestamp: accountInfo.balance.timestamp,
      tokens: accountInfo.balance.tokens,
    };
  }

  async getTransactionHistory(
    accountId: string,
    options?: { limit?: number }
  ): Promise<Transaction[]> {
    const transactions: Transaction[] = [];

    for await (const transaction of this.paginate<Transaction>('/api/v1/transactions', {
      'account.id': accountId,
    })) {
      transactions.push(transaction);

      if (options?.limit !== undefined && transactions.length >= options.limit) {
        break;
      }
    }

    return transactions;
  }

  private async get<T>(path: string, params?: QueryParams): Promise<T> {
    await this.ssrfCheckPromise;

    for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.client.get<T>(path, params ? { params } : undefined);
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const statusCode = axiosError.response?.status;
        const isRetryableStatus = statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
        const isFinalAttempt = attempt === RETRY_MAX_ATTEMPTS;

        if (!isRetryableStatus || isFinalAttempt) {
          const message = this.getErrorMessage(axiosError);
          throw new MirrorNodeError(message, statusCode, path);
        }

        const backoff = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        const jitter = Math.floor(Math.random() * (RETRY_JITTER_MS * 2 + 1)) - RETRY_JITTER_MS;
        const delayMs = Math.max(0, backoff + jitter);

        await this.sleep(delayMs);
      }
    }

    throw new MirrorNodeError('Retry loop exited unexpectedly', undefined, path);
  }

  private extractItems<T>(response: PaginatedMirrorResponse<T>): T[] {
    for (const [key, value] of Object.entries(response)) {
      if (key === 'links') {
        continue;
      }

      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  }

  private normalizeNextPath(rawNext: string): string {
    if (rawNext.startsWith('/')) {
      return rawNext;
    }

    const parsedNext = new URL(rawNext);
    if (parsedNext.hostname !== this.baseHost) {
      throw new SSRFBlockedError(rawNext, 'links.next host does not match configured mirror host');
    }

    return `${parsedNext.pathname}${parsedNext.search}`;
  }

  private async assertSafeMirrorNodeHost(): Promise<void> {
    if (this.isPrivateIpv4(this.baseHost)) {
      throw new SSRFBlockedError(this.baseUrl, `host resolves to private address ${this.baseHost}`);
    }

    if (typeof window !== 'undefined') {
      return;
    }

    if (typeof process === 'undefined' || typeof process.versions?.node === 'undefined') {
      return;
    }

    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      return;
    }

    try {
      const runtimeImport = new Function(
        'specifier',
        'return import(specifier);'
      ) as (specifier: string) => Promise<typeof import('node:dns/promises')>;

      const dns = await runtimeImport('node:dns/promises');
      const resolved = await dns.lookup(this.baseHost, { all: true, verbatim: true });
      for (const record of resolved) {
        if (this.isPrivateIpv4(record.address)) {
          throw new SSRFBlockedError(
            this.baseUrl,
            `host resolves to private address ${record.address}`
          );
        }
      }
    } catch (error) {
      if (error instanceof SSRFBlockedError) {
        throw error;
      }

      throw new MirrorNodeError(
        `Mirror node host could not be resolved: ${this.baseHost}`,
        undefined,
        '/'
      );
    }
  }

  private isPrivateIpv4(ipOrHost: string): boolean {
    const parts = ipOrHost.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
      return false;
    }

    const [first, second] = parts;

    if (first === 10 || first === 127) {
      return true;
    }

    if (first === 192 && second === 168) {
      return true;
    }

    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }

    return false;
  }

  private getErrorMessage(error: AxiosError): string {
    const data = error.response?.data as
      | { message?: string; error?: string; _status?: { messages?: Array<{ message?: string }> } }
      | undefined;

    return (
      data?._status?.messages?.[0]?.message ??
      data?.message ??
      data?.error ??
      error.message ??
      'Mirror node request failed'
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
