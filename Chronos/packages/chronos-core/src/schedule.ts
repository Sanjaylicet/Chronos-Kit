/**
 * Schedule manager for HIP-423 Long-Term Scheduled Transactions
 */

import {
  ScheduleCreateTransaction,
  Transaction,
  PrivateKey,
  Timestamp,
} from '@hashgraph/sdk';

import { ScheduleTransactionConfig } from './types';
import { normalizeAccountId } from './utils';

/**
 * ScheduleManager for creating and managing scheduled transactions
 */
export class ScheduleManager {
  private readonly config: ScheduleTransactionConfig;

  constructor(config: ScheduleTransactionConfig) {
    this.config = config;
  }

  /**
   * Create a scheduled transaction from a regular transaction
   * 
   * @param transaction - The transaction to schedule
   * @param memo - Optional memo for the schedule
   * @returns The schedule create transaction
   */
  createSchedule(
    transaction: Transaction,
    memo?: string
  ): ScheduleCreateTransaction {
    const payer = normalizeAccountId(this.config.payerAccountId);

    const scheduleTransaction = new ScheduleCreateTransaction()
      .setScheduledTransaction(transaction)
      .setPayerAccountId(payer);

    if (memo) {
      scheduleTransaction.setScheduleMemo(memo);
    }

    if (this.config.adminKey) {
      scheduleTransaction.setAdminKey(this.config.adminKey);
    }

    if (this.config.expirationTime) {
      scheduleTransaction.setExpirationTime(
        Timestamp.fromDate(this.config.expirationTime)
      );
    }

    if (this.config.waitForExpiry !== undefined) {
      scheduleTransaction.setWaitForExpiry(this.config.waitForExpiry);
    }

    return scheduleTransaction;
  }

  /**
   * Sign a scheduled transaction
   * 
   * @param scheduleTransaction - The schedule create transaction
   * @param signingKey - The key to sign with
   * @returns The signed transaction
   */
  async signSchedule(
    scheduleTransaction: ScheduleCreateTransaction,
    signingKey: PrivateKey
  ): Promise<ScheduleCreateTransaction> {
    return scheduleTransaction.sign(signingKey);
  }
}
