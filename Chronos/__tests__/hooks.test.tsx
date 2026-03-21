// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { PrivateKey, type TransactionReceipt } from '@hashgraph/sdk';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BatchCompiler } from '../lib/batch';
import { PreFlightError } from '../lib/errors';
import { PreFlightEngine } from '../lib/preflight';
import { ScheduleManager } from '../lib/schedule';
import { useHieroAccount } from '../hooks/useHieroAccount';
import { useHieroBatch } from '../hooks/useHieroBatch';
import { useHieroSchedule } from '../hooks/useHieroSchedule';

const { mockUseChronos, mockSetClient } = vi.hoisted(() => ({
  mockUseChronos: vi.fn(),
  mockSetClient: vi.fn(),
}));

vi.mock('@/components/providers/ChronosProvider', () => ({
  useChronos: () => mockUseChronos(),
}));

function createMutationWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('React hooks', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };

    mockSetClient.mockReset();
    mockUseChronos.mockReturnValue({
      client: {} as never,
      mirrorNodeClient: {} as never,
      setClient: mockSetClient,
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('useHieroAccount returns isReady false initially and sets error when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_HEDERA_NETWORK;
    delete process.env.NEXT_PUBLIC_OPERATOR_ID;
    delete process.env.NEXT_PUBLIC_OPERATOR_KEY;

    const { result } = renderHook(() => useHieroAccount());

    expect(result.current.isReady).toBe(false);

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('NEXT_PUBLIC_HEDERA_NETWORK');
    });

    expect(result.current.isReady).toBe(false);
  });

  it('useHieroBatch.submitBatch throws PreFlightError when pre-flight fails', async () => {
    vi.spyOn(PreFlightEngine.prototype, 'run').mockResolvedValue({
      passed: false,
      failures: [
        {
          reason: 'INSUFFICIENT_HBAR',
          accountId: '0.0.1',
          required: BigInt(1000),
        },
      ],
    });

    const wrapper = createMutationWrapper();
    const { result } = renderHook(() => useHieroBatch(), { wrapper });

    const plan = {
      payerAccountId: '0.0.1',
      innerTransactions: [],
      tokenTransfers: [],
    };

    const rejected = await result.current.submitBatch([], plan).catch((error) => error);

    expect(rejected).toBeInstanceOf(PreFlightError);
    expect(rejected).toMatchObject({
      failures: [{ reason: 'INSUFFICIENT_HBAR', accountId: '0.0.1', required: BigInt(1000) }],
    });
  });

  it('useHieroSchedule.scheduleFor calls ScheduleManager.wrap with the correct executeAt date', async () => {
    const executeAt = new Date('2026-04-01T00:00:00.000Z');

    const fakeBatch = {} as never;
    const fakeReceipt = { status: 'SUCCESS' } as unknown as TransactionReceipt;
    const getReceipt = vi.fn().mockResolvedValue(fakeReceipt);
    const execute = vi.fn().mockResolvedValue({ getReceipt });
    const sign = vi.fn().mockResolvedValue({ execute });

    vi.spyOn(PreFlightEngine.prototype, 'run').mockResolvedValue({ passed: true, failures: [] });
    vi.spyOn(BatchCompiler.prototype, 'compile').mockReturnValue([fakeBatch]);
    const wrapSpy = vi.spyOn(ScheduleManager.prototype, 'wrap').mockReturnValue({ sign } as never);

    vi.spyOn(PrivateKey, 'fromStringECDSA').mockReturnValue({} as never);

    process.env.NEXT_PUBLIC_OPERATOR_KEY = '302e020100300506032b657004220420aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    const wrapper = createMutationWrapper();
    const { result } = renderHook(() => useHieroSchedule(), { wrapper });

    const plan = {
      payerAccountId: '0.0.2',
      innerTransactions: [],
      tokenTransfers: [],
    };

    await expect(result.current.scheduleFor([], plan, executeAt, 'monthly')).resolves.toBe(fakeReceipt);

    expect(wrapSpy).toHaveBeenCalledTimes(1);
    expect(wrapSpy).toHaveBeenCalledWith(fakeBatch, executeAt, 'monthly');
  });
});
