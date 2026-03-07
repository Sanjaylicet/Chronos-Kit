import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['dist', 'node_modules'],
        setupFiles: ['./src/__tests__/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'lcov', 'html'],
            reportsDirectory: './coverage',
            exclude: [
                'dist/**',
                'node_modules/**',
                'src/index.tsx',
                '**/*.d.ts',
                '**/*.test.{ts,tsx}',
                'src/__tests__/setup.ts',
            ],
            thresholds: {
                lines: 75,
                functions: 75,
                branches: 70,
                statements: 75,
            },
        },
    },
});
