'use client';

import { useChronos } from '@/components/providers/ChronosProvider';
import { useHieroAccount } from '@/hooks/useHieroAccount';
import { useHieroSchedule } from '@/hooks/useHieroSchedule';
import { BatchCompiler } from '@/lib/batch';
import type { PreFlightFailure, PreFlightPlan, PreFlightResult } from '@/lib/preflight';
import { PreFlightEngine } from '@/lib/preflight';
import { ScheduleManager } from '@/lib/schedule';
import {
  AccountId,
  TokenId,
  TokenMintTransaction,
  TokenWipeTransaction,
  TopicId,
  TopicMessageSubmitTransaction,
  TransferTransaction,
  type Transaction,
} from '@hashgraph/sdk';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

const DEMO_TOPIC_ID = '0.0.5005';

const accountIdSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'Must match shard.realm.num');
const tokenIdSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'Must match shard.realm.num');

const formSchema = z.object({
  operatorAccountId: accountIdSchema,
  contributorAccountIds: z.array(accountIdSchema).length(5),
  penalizedAccountId: accountIdSchema,
  tokenId: tokenIdSchema,
  executeAt: z.string().min(1),
});

interface PayrollFormState {
  operatorAccountId: string;
  contributorAccountIds: string[];
  penalizedAccountId: string;
  tokenId: string;
  executeAt: string;
}

interface PlanMetrics {
  estimatedFeeTinybars: bigint;
  totalByteSize: number;
  batchChunkCount: number;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromDateInputValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function estimateFeeTinybars(innerTransactionCount: number): bigint {
  return BigInt(1_200_000) + BigInt(500_000) * BigInt(innerTransactionCount);
}

function tinybarsToHbar(tinybars: bigint): string {
  return (Number(tinybars) / 100_000_000).toFixed(8);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function buildTransactionsAndPlan(values: z.infer<typeof formSchema>): Promise<{
  transactions: Transaction[];
  plan: PreFlightPlan;
  metrics: PlanMetrics;
}> {
  const operatorAccountId = AccountId.fromString(values.operatorAccountId);
  const penalizedAccountId = AccountId.fromString(values.penalizedAccountId);
  const contributorAccountIds = values.contributorAccountIds.map((value) => AccountId.fromString(value));
  const tokenId = TokenId.fromString(values.tokenId);
  const executeAt = fromDateInputValue(values.executeAt);

  const payrollEvent = {
    operatorAccountId: values.operatorAccountId,
    penalizedAccountId: values.penalizedAccountId,
    contributorAccountIds: values.contributorAccountIds,
    tokenId: values.tokenId,
    executeAt: executeAt.toISOString(),
    wipeAmount: 100,
    mintAmount: 5000,
    transferAmountEach: 1000,
    contributorCount: 5,
    kind: 'DAO_MONTHLY_PAYROLL',
  };

  const eventHash = await sha256Hex(JSON.stringify(payrollEvent));

  const transactions: Transaction[] = [
    new TokenWipeTransaction().setTokenId(tokenId).setAccountId(penalizedAccountId).setAmount(100),
    new TokenMintTransaction().setTokenId(tokenId).setAmount(5000),
    ...contributorAccountIds.map((contributorId) =>
      new TransferTransaction()
        .addTokenTransfer(tokenId, operatorAccountId, -1000)
        .addTokenTransfer(tokenId, contributorId, 1000)
    ),
    new TopicMessageSubmitTransaction().setTopicId(TopicId.fromString(DEMO_TOPIC_ID)).setMessage(eventHash),
  ];

  const compiler = new BatchCompiler();
  for (const transaction of transactions) {
    compiler.add(transaction);
  }

  const batchChunkCount = compiler.compile().length;

  const plan: PreFlightPlan = {
    payerAccountId: values.operatorAccountId,
    innerTransactions: transactions,
    tokenTransfers: [
      { accountId: values.operatorAccountId, tokenId: values.tokenId },
      { accountId: values.penalizedAccountId, tokenId: values.tokenId },
      ...values.contributorAccountIds.map((accountId) => ({
        accountId,
        tokenId: values.tokenId,
      })),
    ],
  };

  return {
    transactions,
    plan,
    metrics: {
      estimatedFeeTinybars: estimateFeeTinybars(transactions.length),
      totalByteSize: compiler.estimateByteSize(),
      batchChunkCount,
    },
  };
}

function checkStatusRows(result: PreFlightResult | null): Array<{
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}> {
  const failures = result?.failures ?? [];

  const byReason = (reason: PreFlightFailure['reason']) =>
    failures.filter((failure) => failure.reason === reason);

  const insufficientHbar = byReason('INSUFFICIENT_HBAR');
  const notAssociated = byReason('NOT_ASSOCIATED');
  const frozen = byReason('ACCOUNT_FROZEN');
  const kycMissing = byReason('KYC_NOT_GRANTED');

  return [
    {
      key: 'hbar',
      label: 'HBAR liquidity',
      passed: insufficientHbar.length === 0,
      detail:
        insufficientHbar.length === 0
          ? 'payer has enough tinybars'
          : `required tinybars: ${insufficientHbar[0]?.required?.toString() ?? 'unknown'}`,
    },
    {
      key: 'association',
      label: 'Token association checks',
      passed: notAssociated.length === 0,
      detail:
        notAssociated.length === 0
          ? 'all token relationships are associated'
          : `${notAssociated.length} association check(s) failed`,
    },
    {
      key: 'freeze',
      label: 'Freeze status checks',
      passed: frozen.length === 0,
      detail:
        frozen.length === 0
          ? 'all accounts are unfrozen for token'
          : `${frozen.length} account(s) are frozen`,
    },
    {
      key: 'kyc',
      label: 'KYC checks',
      passed: kycMissing.length === 0,
      detail:
        kycMissing.length === 0
          ? 'kyc granted or not applicable'
          : `${kycMissing.length} account(s) missing kyc grant`,
    },
  ];
}

export default function DemoPage() {
  const { mirrorNodeClient } = useChronos();
  const { client, accountId: connectedAccountId, isReady, error: accountError } = useHieroAccount();
  const {
    scheduleFor,
    isPending: isScheduling,
    isSuccess: isScheduleSuccess,
    isError: isScheduleError,
    error: scheduleError,
    receipt,
  } = useHieroSchedule();

  const [form, setForm] = useState<PayrollFormState>({
    operatorAccountId: '',
    contributorAccountIds: ['', '', '', '', ''],
    penalizedAccountId: '',
    tokenId: '',
    executeAt: toDateInputValue(ScheduleManager.nextMonthFirst()),
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preflightResult, setPreflightResult] = useState<PreFlightResult | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [isPreflighting, setIsPreflighting] = useState(false);
  const [metrics, setMetrics] = useState<PlanMetrics | null>(null);
  const [scheduledExecutionDate, setScheduledExecutionDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!form.operatorAccountId && connectedAccountId) {
      setForm((prev) => ({ ...prev, operatorAccountId: connectedAccountId }));
    }
  }, [connectedAccountId, form.operatorAccountId]);

  const preflightRows = useMemo(() => checkStatusRows(preflightResult), [preflightResult]);

  const updateContributor = (index: number, value: string) => {
    setForm((previous) => {
      const nextContributors = [...previous.contributorAccountIds];
      nextContributors[index] = value;
      return { ...previous, contributorAccountIds: nextContributors };
    });
  };

  const validateForm = (): z.infer<typeof formSchema> | null => {
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? 'Invalid payroll form values';
      setValidationError(firstIssue);
      return null;
    }

    setValidationError(null);
    return parsed.data;
  };

  const runPreflight = async () => {
    const parsed = validateForm();
    if (!parsed) {
      return;
    }

    setIsPreflighting(true);
    setPreflightError(null);

    try {
      const { plan, metrics: nextMetrics } = await buildTransactionsAndPlan(parsed);
      const result = await new PreFlightEngine(mirrorNodeClient).run(plan);
      setMetrics(nextMetrics);
      setPreflightResult(result);
    } catch (error) {
      setPreflightResult(null);
      setMetrics(null);
      setPreflightError(error instanceof Error ? error.message : 'Pre-flight failed');
    } finally {
      setIsPreflighting(false);
    }
  };

  const runSchedule = async () => {
    const parsed = validateForm();
    if (!parsed) {
      return;
    }

    try {
      const { transactions, plan, metrics: nextMetrics } = await buildTransactionsAndPlan(parsed);
      setMetrics(nextMetrics);
      const executeAt = fromDateInputValue(parsed.executeAt);
      await scheduleFor(transactions, plan, executeAt, 'DAO monthly payroll demo schedule');
      setScheduledExecutionDate(executeAt);
    } catch {
      // error is surfaced by useHieroSchedule
    }
  };

  return (
    <div className="container">
      <header className="site-header">
        <div className="inner">
          <div className="brand">
            <h1>Chronos Kit</h1>
            <span>Demo</span>
          </div>
          <span className="network-badge">DAO Payroll</span>
        </div>
      </header>

      <main>
        <section className="hero">
          <h2>DAO Monthly Payroll Demo</h2>
          <p>
            Build HIP-551 payroll batches, run pre-flight checks, and schedule execution with HIP-423.
          </p>
        </section>

        <section className="card">
          <h3>Payroll Inputs</h3>

          <div className="search-row" style={{ marginBottom: 10 }}>
            <input
              type="text"
              value={form.operatorAccountId}
              onChange={(event) => setForm((prev) => ({ ...prev, operatorAccountId: event.target.value }))}
              placeholder="Operator account ID (e.g. 0.0.1001)"
              aria-label="Operator account ID"
            />
          </div>

          {form.contributorAccountIds.map((value, index) => (
            <div key={`contributor-${index}`} className="search-row" style={{ marginBottom: 10 }}>
              <input
                type="text"
                value={value}
                onChange={(event) => updateContributor(index, event.target.value)}
                placeholder={`Contributor ${index + 1} account ID`}
                aria-label={`Contributor ${index + 1} account ID`}
              />
            </div>
          ))}

          <div className="search-row" style={{ marginBottom: 10 }}>
            <input
              type="text"
              value={form.penalizedAccountId}
              onChange={(event) => setForm((prev) => ({ ...prev, penalizedAccountId: event.target.value }))}
              placeholder="Penalized account ID"
              aria-label="Penalized account ID"
            />
          </div>

          <div className="search-row" style={{ marginBottom: 10 }}>
            <input
              type="text"
              value={form.tokenId}
              onChange={(event) => setForm((prev) => ({ ...prev, tokenId: event.target.value }))}
              placeholder="Token ID (e.g. 0.0.5555)"
              aria-label="Token ID"
            />
          </div>

          <div className="search-row" style={{ marginBottom: 10 }}>
            <input
              type="date"
              value={form.executeAt}
              onChange={(event) => setForm((prev) => ({ ...prev, executeAt: event.target.value }))}
              aria-label="Scheduled execution date"
            />
          </div>

          <div className="search-row">
            <button type="button" className="btn" onClick={runPreflight} disabled={isPreflighting || isScheduling}>
              {isPreflighting ? 'Running pre-flight…' : 'Run pre-flight'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={runSchedule}
              disabled={isScheduling || !isReady || !client}
            >
              {isScheduling ? 'Scheduling…' : 'Schedule payroll'}
            </button>
          </div>

          {!isReady && !accountError && <p className="loading">Connecting Hiero operator client…</p>}
          {accountError && <p className="error-msg">{accountError.message}</p>}
          {validationError && <p className="error-msg">{validationError}</p>}
          {preflightError && <p className="error-msg">{preflightError}</p>}
          {isScheduleError && scheduleError && <p className="error-msg">{scheduleError.message}</p>}
        </section>

        <section className="card">
          <h3>Pre-flight Results</h3>
          {!preflightResult && <p className="loading">Run pre-flight to evaluate all checks.</p>}

          {preflightResult && (
            <div className="result-box">
              {preflightRows.map((row) => (
                <div key={row.key} className="row">
                  <span className="label">{row.label}</span>
                  <span className="value">{row.passed ? `✅ PASS — ${row.detail}` : `❌ FAIL — ${row.detail}`}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h3>Batch & Fee Metrics</h3>
          {!metrics && <p className="loading">Metrics appear after pre-flight or scheduling.</p>}

          {metrics && (
            <div className="result-box">
              <div className="row">
                <span className="label">Estimated Fee (HBAR)</span>
                <span className="value">{tinybarsToHbar(metrics.estimatedFeeTinybars)}</span>
              </div>
              <div className="row">
                <span className="label">Total Byte Size</span>
                <span className="value">{metrics.totalByteSize.toLocaleString()} bytes</span>
              </div>
              <div className="row">
                <span className="label">Batch Chunk Count</span>
                <span className="value">{metrics.batchChunkCount}</span>
              </div>
            </div>
          )}
        </section>

        {isScheduling && (
          <section className="card">
            <h3>Submission Status</h3>
            <p className="loading">⏳ Submitting scheduled payroll transaction…</p>
          </section>
        )}

        {isScheduleSuccess && receipt?.scheduleId && scheduledExecutionDate && (
          <section className="card">
            <h3>Schedule Created</h3>
            <div className="result-box">
              <div className="row">
                <span className="label">Schedule ID</span>
                <span className="value">{receipt.scheduleId.toString()}</span>
              </div>
              <div className="row">
                <span className="label">Execution Date</span>
                <span className="value">{scheduledExecutionDate.toISOString()}</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
