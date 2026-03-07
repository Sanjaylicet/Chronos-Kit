/**
 * Test setup file for @chronos-kit/react
 * Configures @testing-library/react and cleans up after each test.
 */

import { beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom';

// Suppress React 18 act() warnings during tests
// (they are informational, not failures, in this context)
const originalError = console.error.bind(console);
beforeAll(() => {
    console.error = (...args: unknown[]) => {
        const msg = String(args[0]);
        if (msg.includes('act(') || msg.includes('ReactDOM.render')) return;
        originalError(...args);
    };
});

afterAll(() => {
    console.error = originalError;
});
