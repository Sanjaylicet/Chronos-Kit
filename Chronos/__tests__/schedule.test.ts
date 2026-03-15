import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BatchTransaction,
  ScheduleCreateTransaction,
  TransferTransaction,
} from '@hashgraph/sdk';

import { ScheduleManager } from '../lib/schedule';
import { NestedScheduleError, SchedulePastDateError } from '../lib/errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A future date 30 days from the mocked "now". */
const FUTURE_OFFSET_MS = 30 * 24 * 60 * 60 * 1_000;

/** Arbitrary fixed "now" so tests are deterministic. */
const FIXED_NOW = new Date('2026-06-15T12:00:00.000Z');

function future(offsetMs = FUTURE_OFFSET_MS): Date {
  return new Date(FIXED_NOW.getTime() + offsetMs);
}

function past(): Date {
  return new Date(FIXED_NOW.getTime() - 1);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ScheduleManager', () => {
  const manager = new ScheduleManager();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 1. wrap() returns a ScheduleCreateTransaction ─────────────────────────

  it('wrap() returns a ScheduleCreateTransaction instance', () => {
    const tx = new TransferTransaction();
    const sct = manager.wrap(tx, future());
    expect(sct).toBeInstanceOf(ScheduleCreateTransaction);
  });

  // ── 2. waitForExpiry is always true ──────────────────────────────────────

  it('wrap() always sets waitForExpiry to true', () => {
    const sct = manager.wrap(new TransferTransaction(), future());
    expect(sct.waitForExpiry).toBe(true);
  });

  // ── 3. schedeMemo is set only when provided ───────────────────────────────

  it('wrap() sets scheduleMemo when memo is provided', () => {
    const sct = manager.wrap(new TransferTransaction(), future(), 'monthly-payroll');
    // getScheduleMemo is a getter property in this SDK version (not a method)
    expect(sct.getScheduleMemo).toBe('monthly-payroll');
  });

  it('wrap() does not set scheduleMemo when memo is omitted', () => {
    const sct = manager.wrap(new TransferTransaction(), future());
    // Default SDK value for an unset memo is null
    expect(sct.getScheduleMemo ?? null).toBeNull();
  });

  // ── 4. Past date throws SchedulePastDateError ─────────────────────────────

  it('wrap() throws SchedulePastDateError for a past date', () => {
    expect(() => manager.wrap(new TransferTransaction(), past())).toThrowError(
      SchedulePastDateError,
    );
  });

  it('SchedulePastDateError includes the rejected date', () => {
    const badDate = past();
    try {
      manager.wrap(new TransferTransaction(), badDate);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SchedulePastDateError);
      expect((err as SchedulePastDateError).date).toEqual(badDate);
      expect((err as SchedulePastDateError).message).toContain(
        badDate.toISOString(),
      );
    }
  });

  it('wrap() throws SchedulePastDateError for a date equal to now (not strictly future)', () => {
    // Date.now() === FIXED_NOW exactly — should still be rejected
    expect(() => manager.wrap(new TransferTransaction(), FIXED_NOW)).toThrowError(
      SchedulePastDateError,
    );
  });

  // ── 5. Wrapping a ScheduleCreateTransaction directly throws NestedScheduleError ──

  it('throws NestedScheduleError when wrapping a ScheduleCreateTransaction directly', () => {
    const nested = new ScheduleCreateTransaction();
    expect(() => manager.wrap(nested, future())).toThrowError(NestedScheduleError);
  });

  // ── 6. Wrapping a BatchTransaction whose inner txs include a ScheduleCreateTransaction ──

  it('throws NestedScheduleError for a BatchTransaction containing a ScheduleCreateTransaction', () => {
    // Build a frozen inner ScheduleCreateTransaction that can be held in a
    // BatchTransaction stub.  We test the guard at the ScheduleManager level,
    // so we mock innerTransactions directly.
    const innerSct = new ScheduleCreateTransaction();
    const bt = new BatchTransaction();
    // Bypass SDK freeze requirement by stubbing innerTransactions
    vi.spyOn(bt, 'innerTransactions', 'get').mockReturnValue([innerSct] as never);

    expect(() => manager.wrap(bt, future())).toThrowError(NestedScheduleError);
  });

  it('does NOT throw for a BatchTransaction with no ScheduleCreateTransaction inner txs', () => {
    const bt = new BatchTransaction();
    vi.spyOn(bt, 'innerTransactions', 'get').mockReturnValue([
      new TransferTransaction(),
    ] as never);

    expect(() => manager.wrap(bt, future())).not.toThrow();
  });

  // ── 7. nextMonthFirst() ───────────────────────────────────────────────────

  it('nextMonthFirst() returns midnight UTC on the first of next month', () => {
    // FIXED_NOW is 2026-06-15 → next month first = 2026-07-01T00:00:00Z
    const result = ScheduleManager.nextMonthFirst();
    expect(result.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it('nextMonthFirst() rolls over correctly from December to January', () => {
    vi.setSystemTime(new Date('2026-12-20T10:00:00.000Z'));
    const result = ScheduleManager.nextMonthFirst();
    expect(result.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  // ── 8. toUnixTimestamp() ─────────────────────────────────────────────────

  it('toUnixTimestamp() converts a Date to whole seconds', () => {
    const date = new Date('2027-01-01T00:00:00.000Z');
    expect(ScheduleManager.toUnixTimestamp(date)).toBe(1798761600);
  });

  it('toUnixTimestamp() floors sub-second precision', () => {
    const date = new Date('2027-01-01T00:00:00.999Z');
    expect(ScheduleManager.toUnixTimestamp(date)).toBe(1798761600);
  });

  it('toUnixTimestamp() round-trips through new Date(result * 1000)', () => {
    const original = new Date('2026-06-15T12:00:00.000Z');
    const ts = ScheduleManager.toUnixTimestamp(original);
    expect(new Date(ts * 1_000).toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });
});
