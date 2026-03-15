/**
 * PreFlightEngine — parallel pre-flight checks for HIP-551 / HIP-423 plans.
 *
 * Runs HBAR liquidity, token association, freeze-flag, and KYC checks in
 * parallel, collects every failure, and returns a single PreFlightResult.
 */

import type { Transaction } from '@hashgraph/sdk';

import type { MirrorNodeClient } from './client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Flat fee charged for the outer ScheduleCreateTransaction (tinybars). */
const SCHEDULE_CREATE_FEE = 1_000_000n;

/** Flat fee charged for the outer BatchTransaction container (tinybars). */
const BATCH_OUTER_FEE = 200_000n;

/** Per-inner-transaction base fee estimate (tinybars). */
const BASE_FEE_TINYBARS = 500_000n;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PreFlightFailureReason =
  | 'INSUFFICIENT_HBAR'
  | 'NOT_ASSOCIATED'
  | 'ACCOUNT_FROZEN'
  | 'KYC_NOT_GRANTED';

export interface PreFlightFailure {
  reason: PreFlightFailureReason;
  accountId: string;
  tokenId?: string;
  /** Populated for INSUFFICIENT_HBAR failures — the exact required amount. */
  required?: bigint;
}

export interface PreFlightPlan {
  payerAccountId: string;
  innerTransactions: Transaction[];
  tokenTransfers: Array<{ accountId: string; tokenId: string }>;
}

export interface PreFlightResult {
  passed: boolean;
  failures: PreFlightFailure[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class PreFlightEngine {
  constructor(private readonly client: MirrorNodeClient) {}

  /**
   * Runs all pre-flight checks in parallel and returns a consolidated result.
   *
   * Every check is executed regardless of whether an earlier check failed —
   * no short-circuiting.
   */
  async run(plan: PreFlightPlan): Promise<PreFlightResult> {
    const { payerAccountId, innerTransactions, tokenTransfers } = plan;

    const totalFee =
      SCHEDULE_CREATE_FEE +
      BATCH_OUTER_FEE +
      BASE_FEE_TINYBARS * BigInt(innerTransactions.length);

    // Build one promise per check; each resolves to zero or more failures.
    const checkPromises: Promise<PreFlightFailure[]>[] = [];

    // ── 1. HBAR liquidity ──────────────────────────────────────────────────
    checkPromises.push(
      this.client
        .verifyHbarBalance(payerAccountId, totalFee)
        .then((ok): PreFlightFailure[] =>
          ok
            ? []
            : [{ reason: 'INSUFFICIENT_HBAR', accountId: payerAccountId, required: totalFee }],
        )
        .catch((): PreFlightFailure[] => [
          { reason: 'INSUFFICIENT_HBAR', accountId: payerAccountId, required: totalFee },
        ]),
    );

    // ── 2–4. Per-token-transfer checks ────────────────────────────────────
    for (const { accountId, tokenId } of tokenTransfers) {
      // Token association
      checkPromises.push(
        this.client
          .verifyTokenAssociation(accountId, tokenId)
          .then((ok): PreFlightFailure[] =>
            ok ? [] : [{ reason: 'NOT_ASSOCIATED', accountId, tokenId }],
          )
          .catch((): PreFlightFailure[] => [{ reason: 'NOT_ASSOCIATED', accountId, tokenId }]),
      );

      // Freeze flag (true means NOT frozen / acceptable)
      checkPromises.push(
        this.client
          .checkFreezeFlag(accountId, tokenId)
          .then((ok): PreFlightFailure[] =>
            ok ? [] : [{ reason: 'ACCOUNT_FROZEN', accountId, tokenId }],
          )
          .catch((): PreFlightFailure[] => [{ reason: 'ACCOUNT_FROZEN', accountId, tokenId }]),
      );

      // KYC
      checkPromises.push(
        this.client
          .checkKycGranted(accountId, tokenId)
          .then((ok): PreFlightFailure[] =>
            ok ? [] : [{ reason: 'KYC_NOT_GRANTED', accountId, tokenId }],
          )
          .catch((): PreFlightFailure[] => [{ reason: 'KYC_NOT_GRANTED', accountId, tokenId }]),
      );
    }

    const results = await Promise.all(checkPromises);
    const failures = results.flat();

    return { passed: failures.length === 0, failures };
  }
}
