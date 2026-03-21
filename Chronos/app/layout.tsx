import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

export const metadata: Metadata = {
  title: 'Chronos Kit — Hiero DeFi Scheduler',
  description:
    'Intent-based DeFi scheduling on the Hiero network. HIP-551 atomic batch transactions and HIP-423 long-term scheduled transactions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
