'use client';

import { useHieroAccount } from '@/hooks/useHieroAccount';

export function AccountDashboard() {
  const { client, accountId, isReady, error } = useHieroAccount();

  return (
    <div className="card">
      <h3>Hiero Operator Session</h3>

      {!isReady && !error && <p className="loading">Initializing Hiero client…</p>}

      {error && (
        <p className="error-msg">{error.message}</p>
      )}

      {isReady && !error && (
        <div className="result-box">
          <div className="row">
            <span className="label">Status</span>
            <span className="value">Connected</span>
          </div>
          <div className="row">
            <span className="label">Operator Account ID</span>
            <span className="value">{accountId ?? 'Unavailable'}</span>
          </div>
          <div className="row">
            <span className="label">Client Instance</span>
            <span className="value">{client ? 'Ready' : 'Unavailable'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
