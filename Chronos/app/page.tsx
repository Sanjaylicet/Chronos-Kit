import { AccountDashboard } from '@/components/AccountDashboard';

const network = process.env.NEXT_PUBLIC_HIERO_NETWORK ?? 'testnet';

export default function Home() {
  return (
    <div className="container">
      <header className="site-header">
        <div className="inner">
          <div className="brand">
            <h1>Chronos Kit</h1>
            <span>Beta</span>
          </div>
          <span className="network-badge">{network}</span>
        </div>
      </header>

      <main>
        <section className="hero">
          <h2>DeFi Scheduling on Hiero</h2>
          <p>
            Atomic batch transactions (HIP-551) and long-term scheduled
            transactions (HIP-423) for the Hiero network.
          </p>
        </section>

        <AccountDashboard />

        <div className="features">
          <div className="feature-card">
            <div className="icon">⚡</div>
            <h4>Atomic Batch (HIP-551)</h4>
            <p>
              Bundle up to 50 transactions into a single atomic unit. All
              succeed or all fail — no partial states.
            </p>
          </div>
          <div className="feature-card">
            <div className="icon">🗓</div>
            <h4>Scheduled Transactions (HIP-423)</h4>
            <p>
              Create long-term scheduled transactions with expiry times and
              multi-signature collection.
            </p>
          </div>
          <div className="feature-card">
            <div className="icon">🔍</div>
            <h4>Mirror Node Client</h4>
            <p>
              Type-safe Mirror Node REST API client with pagination, retry
              back-off, and SSRF protection.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
