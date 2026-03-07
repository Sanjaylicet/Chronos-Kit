/**
 * Unit tests for ChronosProvider and useChronos hook
 */

import { HieroNetworkConfig } from '@chronos-kit/core';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ChronosProvider, useChronos } from '../providers/ChronosProvider';


const testConfig: HieroNetworkConfig = {
    network: 'testnet',
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com',
};

// ── Smoke test component ────────────────────────────────────────────
function ConfigDisplay() {
    const { config } = useChronos();
    return <div data-testid="network">{config.network}</div>;
}

// ── Tests ───────────────────────────────────────────────────────────
describe('ChronosProvider', () => {
    it('renders children without crashing', () => {
        render(
            <ChronosProvider config={testConfig}>
                <div data-testid="child">hello</div>
            </ChronosProvider>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('provides config to child components via useChronos', () => {
        render(
            <ChronosProvider config={testConfig}>
                <ConfigDisplay />
            </ChronosProvider>
        );
        expect(screen.getByTestId('network').textContent).toBe('testnet');
    });

    it('provides a mirrorNodeClient instance', () => {
        let capturedClient: unknown;
        function ClientCapture() {
            const { mirrorNodeClient } = useChronos();
            capturedClient = mirrorNodeClient;
            return null;
        }

        render(
            <ChronosProvider config={testConfig}>
                <ClientCapture />
            </ChronosProvider>
        );

        expect(capturedClient).toBeDefined();
        expect(typeof (capturedClient as Record<string, unknown>).getAccountBalance).toBe('function');
    });
});

describe('useChronos', () => {
    it('throws a descriptive error when used outside ChronosProvider', () => {
        // Suppress the expected React error boundary log
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

        function BadConsumer() {
            useChronos();
            return null;
        }

        expect(() => render(<BadConsumer />)).toThrow(
            'useChronos must be used within ChronosProvider'
        );

        spy.mockRestore();
    });
});
