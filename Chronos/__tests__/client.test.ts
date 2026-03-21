import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

import {
  MirrorNodeClient,
  type AccountInfo,
  type TokenBalance,
} from '../lib/client';
import { MirrorNodeError } from '../lib/errors';

const lookupMock = vi.fn();

vi.mock('node:dns/promises', () => ({
  lookup: lookupMock,
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(),
  },
}));

describe('MirrorNodeClient', () => {
  const mockHttp = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    process.env.NEXT_PUBLIC_MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';
    lookupMock.mockResolvedValue([{ address: '34.100.10.10', family: 4 }]);

    vi.mocked(axios.create).mockReturnValue(mockHttp as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('paginate() follows 3 pages and yields all items individually', async () => {
    mockHttp.get
      .mockResolvedValueOnce({
        data: {
          tokens: [{ token_id: '0.0.1' }, { token_id: '0.0.2' }],
          links: { next: '/api/v1/accounts/0.0.1001/tokens?cursor=2' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          tokens: [{ token_id: '0.0.3' }, { token_id: '0.0.4' }],
          links: { next: '/api/v1/accounts/0.0.1001/tokens?cursor=3' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          tokens: [{ token_id: '0.0.5' }],
          links: { next: null },
        },
      });

    const client = new MirrorNodeClient();

    const allItems: Array<{ token_id: string }> = [];
    for await (const item of client.paginate<{ token_id: string }>(
      '/api/v1/accounts/0.0.1001/tokens',
      { limit: '2' }
    )) {
      allItems.push(item);
    }

    expect(allItems).toEqual([
      { token_id: '0.0.1' },
      { token_id: '0.0.2' },
      { token_id: '0.0.3' },
      { token_id: '0.0.4' },
      { token_id: '0.0.5' },
    ]);

    expect(mockHttp.get).toHaveBeenNthCalledWith(1, '/api/v1/accounts/0.0.1001/tokens', {
      params: { limit: '2' },
    });
    expect(mockHttp.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/accounts/0.0.1001/tokens?cursor=2',
      undefined
    );
    expect(mockHttp.get).toHaveBeenNthCalledWith(
      3,
      '/api/v1/accounts/0.0.1001/tokens?cursor=3',
      undefined
    );
  });

  it('retries on 429 and succeeds on the third attempt', async () => {
    vi.useFakeTimers();

    mockHttp.get
      .mockRejectedValueOnce({ response: { status: 429, data: { message: 'rate limited' } } })
      .mockRejectedValueOnce({ response: { status: 429, data: { message: 'rate limited' } } })
      .mockResolvedValueOnce({
        data: {
          account: '0.0.1001',
          auto_renew_period: null,
          balance: { balance: 2000, timestamp: '123.456' },
          created_timestamp: null,
          decline_reward: false,
          deleted: false,
          ethereum_nonce: 0,
          evm_address: '',
          expiry_timestamp: null,
          key: null,
          max_automatic_token_associations: 0,
          memo: '',
          pending_reward: 0,
          receiver_sig_required: false,
          staked_account_id: null,
          staked_node_id: null,
          stake_period_start: null,
        },
      });

    const client = new MirrorNodeClient();

    const promise = client.getAccountInfo('0.0.1001');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.account).toBe('0.0.1001');
    expect(mockHttp.get).toHaveBeenCalledTimes(3);
  });

  it('throws MirrorNodeError with statusCode and path on final failure', async () => {
    vi.useFakeTimers();

    mockHttp.get.mockRejectedValue({
      response: { status: 500, data: { message: 'server exploded' } },
    });

    const client = new MirrorNodeClient();

    const assertion = expect(client.getAccountInfo('0.0.1001')).rejects.toMatchObject({
      name: 'MirrorNodeError',
      statusCode: 500,
      path: '/api/v1/accounts/0.0.1001',
    });

    await vi.runAllTimersAsync();
    await assertion;

    expect(mockHttp.get).toHaveBeenCalledTimes(4);
  });

  it('verifyHbarBalance returns correct boolean', async () => {
    const client = new MirrorNodeClient();

    const richAccount: AccountInfo = {
      account: '0.0.1001',
      auto_renew_period: null,
      balance: { balance: 5000, timestamp: '123.456' },
      created_timestamp: null,
      decline_reward: false,
      deleted: false,
      ethereum_nonce: 0,
      evm_address: '',
      expiry_timestamp: null,
      key: null,
      max_automatic_token_associations: 0,
      memo: '',
      pending_reward: 0,
      receiver_sig_required: false,
      staked_account_id: null,
      staked_node_id: null,
      stake_period_start: null,
    };

    vi.spyOn(client, 'getAccountInfo').mockResolvedValue(richAccount);

    await expect(client.verifyHbarBalance('0.0.1001', BigInt(4000))).resolves.toBe(true);
    await expect(client.verifyHbarBalance('0.0.1001', BigInt(6000))).resolves.toBe(false);
  });

  it('verifyTokenAssociation returns correct boolean', async () => {
    const client = new MirrorNodeClient();

    const tokenBalances: TokenBalance[] = [
      {
        automatic_association: false,
        balance: 1,
        created_timestamp: null,
        decimals: 0,
        freeze_status: 'UNFROZEN',
        kyc_status: 'GRANTED',
        token_id: '0.0.2001',
      },
    ];

    vi.spyOn(client, 'getAccountTokens').mockResolvedValue(tokenBalances);

    await expect(client.verifyTokenAssociation('0.0.1001', '0.0.2001')).resolves.toBe(true);
    await expect(client.verifyTokenAssociation('0.0.1001', '0.0.3001')).resolves.toBe(false);
  });

  it('checkFreezeFlag returns correct boolean', async () => {
    const client = new MirrorNodeClient();

    const tokenBalances: TokenBalance[] = [
      {
        automatic_association: true,
        balance: 10,
        created_timestamp: null,
        decimals: 0,
        freeze_status: 'FROZEN',
        kyc_status: 'GRANTED',
        token_id: '0.0.2001',
      },
      {
        automatic_association: true,
        balance: 10,
        created_timestamp: null,
        decimals: 0,
        freeze_status: 'UNFROZEN',
        kyc_status: 'GRANTED',
        token_id: '0.0.2002',
      },
    ];

    vi.spyOn(client, 'getAccountTokens').mockResolvedValue(tokenBalances);

    await expect(client.checkFreezeFlag('0.0.1001', '0.0.2001')).resolves.toBe(false);
    await expect(client.checkFreezeFlag('0.0.1001', '0.0.2002')).resolves.toBe(true);
  });

  it('checkKycGranted returns correct boolean', async () => {
    const client = new MirrorNodeClient();

    const tokenBalances: TokenBalance[] = [
      {
        automatic_association: true,
        balance: 10,
        created_timestamp: null,
        decimals: 0,
        freeze_status: 'UNFROZEN',
        kyc_status: 'REVOKED',
        token_id: '0.0.2001',
      },
      {
        automatic_association: true,
        balance: 10,
        created_timestamp: null,
        decimals: 0,
        freeze_status: 'UNFROZEN',
        kyc_status: 'GRANTED',
        token_id: '0.0.2002',
      },
    ];

    vi.spyOn(client, 'getAccountTokens').mockResolvedValue(tokenBalances);

    await expect(client.checkKycGranted('0.0.1001', '0.0.2001')).resolves.toBe(false);
    await expect(client.checkKycGranted('0.0.1001', '0.0.2002')).resolves.toBe(true);
  });
});
