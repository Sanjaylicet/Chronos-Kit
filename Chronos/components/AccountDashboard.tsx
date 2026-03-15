'use client';

import { useState, type FormEvent } from 'react';
import { useHieroAccount } from '@/hooks/useHieroAccount';
import { formatAccountBalance } from '@/lib/utils';

export function AccountDashboard() {
  const [inputId, setInputId] = useState('');
  const [accountId, setAccountId] = useState('');

  const { balance, isLoading, error } = useHieroAccount(accountId, {
    enabled: accountId.length > 0,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = inputId.trim();
    if (trimmed) setAccountId(trimmed);
  }

  return (
    <div className="card">
      <h3>Account Balance Lookup</h3>

      <form className="search-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          placeholder="Enter Hiero Account ID (e.g. 0.0.12345)"
          aria-label="Hiero Account ID"
        />
        <button type="submit" className="btn" disabled={isLoading || !inputId.trim()}>
          {isLoading ? 'Loading…' : 'Look Up'}
        </button>
      </form>

      {isLoading && <p className="loading">Fetching balance from Mirror Node…</p>}

      {error && (
        <p className="error-msg">
          {error.message.includes('not found')
            ? `Account "${accountId}" was not found on the network.`
            : error.message}
        </p>
      )}

      {balance !== null && !isLoading && !error && (
        <div className="result-box">
          <div className="row">
            <span className="label">Account ID</span>
            <span className="value">{accountId}</span>
          </div>
          <div className="row">
            <span className="label">HBAR Balance</span>
            <span className="value balance-large">{formatAccountBalance(balance)}</span>
          </div>
          <div className="row">
            <span className="label">Raw (tinybars)</span>
            <span className="value">{balance.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
