/**
 * ScheduleManager — HIP-423 Long-Term Scheduled Transaction builder
 *
 * Wraps any @hashgraph/sdk Transaction (or BatchTransaction) in a
 * ScheduleCreateTransaction with a caller-supplied future execution date and
 * waitForExpiry always set to true.
 */

import {
  BatchTransaction,
  ScheduleCreateTransaction,
  Timestamp,
  Transaction,
} from '@hashgraph/sdk';

import { NestedScheduleError, SchedulePastDateError } from './errors';

export class ScheduleManager {
  /**
   * Wraps `tx` in a `ScheduleCreateTransaction` scheduled to execute at
   * `executeAt`.
   *
   * Rules enforced before wrapping:
   *  - `executeAt` must be in the future; otherwise throws `SchedulePastDateError`.
   *  - `tx` must not itself be a `ScheduleCreateTransaction` (no nesting).
   *  - If `tx` is a `BatchTransaction`, none of its inner transactions may be
   *    a `ScheduleCreateTransaction`.
   *
   * `setWaitForExpiry(true)` is always applied.
   * `setScheduleMemo()` is applied only when `memo` is provided.
   *
   * @throws {SchedulePastDateError}  when `executeAt` is in the past.
   * @throws {NestedScheduleError}    when nesting a schedule inside a schedule.
   */
  wrap(
    tx: Transaction | BatchTransaction,
    executeAt: Date,
    memo?: string,
  ): ScheduleCreateTransaction {
    if (executeAt.getTime() <= Date.now()) {
      throw new SchedulePastDateError(executeAt);
    }

    if (tx instanceof ScheduleCreateTransaction) {
      throw new NestedScheduleError(
        'A ScheduleCreateTransaction cannot be wrapped inside another ScheduleCreateTransaction',
      );
    }

    if (tx instanceof BatchTransaction) {
      for (const inner of tx.innerTransactions) {
        if (inner instanceof ScheduleCreateTransaction) {
          throw new NestedScheduleError(
            'A BatchTransaction containing a ScheduleCreateTransaction cannot be scheduled',
          );
        }
      }
    }

    const sct = new ScheduleCreateTransaction()
      .setScheduledTransaction(tx)
      .setExpirationTime(Timestamp.fromDate(executeAt))
      .setWaitForExpiry(true);

    if (memo !== undefined) {
      sct.setScheduleMemo(memo);
    }

    return sct;
  }

  /**
   * Returns a `Date` set to midnight UTC on the first day of next calendar
   * month relative to the current system clock.
   */
  static nextMonthFirst(): Date {
    const now = new Date();
    // Setting day=1 and advancing the month by 1 handles December → January
    // roll-over automatically (month 12 becomes month 0 of year+1).
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }

  /**
   * Converts a JavaScript `Date` to a Unix timestamp expressed in whole
   * seconds (Hiero network convention).
   */
  static toUnixTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1_000);
  }
}
