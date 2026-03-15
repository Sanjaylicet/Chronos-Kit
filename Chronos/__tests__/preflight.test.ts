import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransferTransaction } from '@hashgraph/sdk';

import type { MirrorNodeClient } from '../lib/client';
import { PreFlightEngine } from '../lib/preflight';
import type { PreFlightPlan } from '../lib/preflight';

// ---------------------------------------------------------------------------
// Mock client factory
// ---------------------------------------------------------------------------

function makeMockClient(overrides: Partial<{
  verifyHbarBalance: boolean;
  verifyTokenAssociation: boolean;
  checkFreezeFlag: boolean;
  checkKycGranted: boolean;
}> = {}): MirrorNodeClient {
  return {
    verifyHbarBalance: vi.fn().mockResolvedValue(overrides.verifyHbarBalance ?? true),
    verifyTokenAssociation: vi.fn().mockResolvedValue(overrides.verifyTokenAssociation ?? true),
    checkFreezeFlag: vi.fn().mockResolvedValue(overrides.checkFreezeFlag ?? true),
    checkKycGranted: vi.fn().mockResolvedValue(overrides.checkKycGranted ?? true),
  } as unknown as MirrorNodeClient;
}

const BASE_PLAN: PreFlightPlan = {
  payerAccountId: '0.0.1001',
  innerTransactions: [new TransferTransaction()],
  tokenTransfers: [{ accountId: '0.0.2001', tokenId: '0.0.3001' }],
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PreFlightEngine', () => {
  // ── 1. All checks passing ─────────────────────────────────────────────────

  it('returns { passed: true, failures: [] } when all checks pass', async () => {
    const engine = new PreFlightEngine(makeMockClient());
    const result = await engine.run(BASE_PLAN);

    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  // ── 2. INSUFFICIENT_HBAR ─────────────────────────────────────────────────

  it('produces INSUFFICIENT_HBAR failure when verifyHbarBalance returns false', async () => {
    const engine = new PreFlightEngine(makeMockClient({ verifyHbarBalance: false }));
    const result = await engine.run(BASE_PLAN);

    expect(result.passed).toBe(false);
    const f = result.failures.find((x) => x.reason === 'INSUFFICIENT_HBAR');
    expect(f).toBeDefined();
    expect(f!.accountId).toBe('0.0.1001');
    expect(typeof f!.required).toBe('bigint');
  });

  it('required fee is SCHEDULE_CREATE_FEE + BATCH_OUTER_FEE + BASE_FEE × innerTx count', async () => {
    const client = makeMockClient({ verifyHbarBalance: false });
    const engine = new PreFlightEngine(client);

    // 3 inner transactions → 1_000_000 + 200_000 + 500_000×3 = 2_700_000
    const plan: PreFlightPlan = {
      ...BASE_PLAN,
      innerTransactions: [
        new TransferTransaction(),
        new TransferTransaction(),
        new TransferTransaction(),
      ],
    };
    const result = await engine.run(plan);

    const f = result.failures.find((x) => x.reason === 'INSUFFICIENT_HBAR');
    expect(f!.required).toBe(2_700_000n);

    // Verify the exact value passed to verifyHbarBalance
    expect(vi.mocked(client.verifyHbarBalance)).toHaveBeenCalledWith(
      '0.0.1001',
      2_700_000n,
    );
  });

  // ── 3. NOT_ASSOCIATED ────────────────────────────────────────────────────

  it('produces NOT_ASSOCIATED failure when verifyTokenAssociation returns false', async () => {
    const engine = new PreFlightEngine(
      makeMockClient({ verifyTokenAssociation: false }),
    );
    const result = await engine.run(BASE_PLAN);

    expect(result.passed).toBe(false);
    const f = result.failures.find((x) => x.reason === 'NOT_ASSOCIATED');
    expect(f).toBeDefined();
    expect(f!.accountId).toBe('0.0.2001');
    expect(f!.tokenId).toBe('0.0.3001');
  });

  // ── 4. ACCOUNT_FROZEN ────────────────────────────────────────────────────

  it('produces ACCOUNT_FROZEN failure when checkFreezeFlag returns false', async () => {
    const engine = new PreFlightEngine(makeMockClient({ checkFreezeFlag: false }));
    const result = await engine.run(BASE_PLAN);

    expect(result.passed).toBe(false);
    const f = result.failures.find((x) => x.reason === 'ACCOUNT_FROZEN');
    expect(f).toBeDefined();
    expect(f!.accountId).toBe('0.0.2001');
    expect(f!.tokenId).toBe('0.0.3001');
  });

  // ── 5. KYC_NOT_GRANTED ───────────────────────────────────────────────────

  it('produces KYC_NOT_GRANTED failure when checkKycGranted returns false', async () => {
    const engine = new PreFlightEngine(makeMockClient({ checkKycGranted: false }));
    const result = await engine.run(BASE_PLAN);

    expect(result.passed).toBe(false);
    const f = result.failures.find((x) => x.reason === 'KYC_NOT_GRANTED');
    expect(f).toBeDefined();
    expect(f!.accountId).toBe('0.0.2001');
    expect(f!.tokenId).toBe('0.0.3001');
  });

  // ── 6. Multiple simultaneous failures are all collected ──────────────────

  it('collects all failures without short-circuiting', async () => {
    const engine = new PreFlightEngine(
      makeMockClient({
        verifyHbarBalance: false,
        verifyTokenAssociation: false,
        checkFreezeFlag: false,
        checkKycGranted: false,
      }),
    );
    const result = await engine.run(BASE_PLAN);

    expect(result.passed).toBe(false);
    const reasons = result.failures.map((f) => f.reason);
    expect(reasons).toContain('INSUFFICIENT_HBAR');
    expect(reasons).toContain('NOT_ASSOCIATED');
    expect(reasons).toContain('ACCOUNT_FROZEN');
    expect(reasons).toContain('KYC_NOT_GRANTED');
    // All 4 failure types must be present
    expect(result.failures).toHaveLength(4);
  });

  // ── 7. Multiple token transfers — failures collected per entry ───────────

  it('checks every tokenTransfer entry and reports failures for each', async () => {
    // First entry passes everything; second entry has no association.
    const client: MirrorNodeClient = {
      verifyHbarBalance: vi.fn().mockResolvedValue(true),
      verifyTokenAssociation: vi.fn()
        .mockResolvedValueOnce(true)   // first entry
        .mockResolvedValueOnce(false), // second entry → NOT_ASSOCIATED
      checkFreezeFlag: vi.fn().mockResolvedValue(true),
      checkKycGranted: vi.fn().mockResolvedValue(true),
    } as unknown as MirrorNodeClient;

    const plan: PreFlightPlan = {
      payerAccountId: '0.0.1001',
      innerTransactions: [new TransferTransaction()],
      tokenTransfers: [
        { accountId: '0.0.2001', tokenId: '0.0.3001' },
        { accountId: '0.0.2002', tokenId: '0.0.3002' },
      ],
    };

    const result = await engine(client).run(plan);

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({
      reason: 'NOT_ASSOCIATED',
      accountId: '0.0.2002',
      tokenId: '0.0.3002',
    });
  });

  // ── 8. No token transfers — only HBAR check runs ─────────────────────────

  it('passes when there are no token transfers and HBAR is sufficient', async () => {
    const engine = new PreFlightEngine(makeMockClient());
    const result = await engine.run({
      payerAccountId: '0.0.1001',
      innerTransactions: [new TransferTransaction()],
      tokenTransfers: [],
    });

    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  // ── 9. Checks run in parallel (Promise.all not sequential) ───────────────

  it('runs all checks in parallel', async () => {
    const order: string[] = [];

    const client: MirrorNodeClient = {
      verifyHbarBalance: vi.fn().mockImplementation(async () => {
        order.push('hbar');
        return true;
      }),
      verifyTokenAssociation: vi.fn().mockImplementation(async () => {
        order.push('assoc');
        return true;
      }),
      checkFreezeFlag: vi.fn().mockImplementation(async () => {
        order.push('freeze');
        return true;
      }),
      checkKycGranted: vi.fn().mockImplementation(async () => {
        order.push('kyc');
        return true;
      }),
    } as unknown as MirrorNodeClient;

    await new PreFlightEngine(client).run(BASE_PLAN);

    // All 4 checks must have been called
    expect(order).toHaveLength(4);
    expect(order).toContain('hbar');
    expect(order).toContain('assoc');
    expect(order).toContain('freeze');
    expect(order).toContain('kyc');
  });
});

// Small helper used in test 7 to avoid shadowing the outer `engine` const
function engine(client: MirrorNodeClient) {
  return new PreFlightEngine(client);
}
