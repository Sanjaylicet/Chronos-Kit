import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    treeshake: true,
    external: ['@hashgraph/sdk'],
    esbuildOptions(options) {
        options.conditions = ['module'];
    },
    banner: {
        js: `/**
 * @chronos-kit/core
 * Hiero network atomic batch (HIP-551) and scheduled transaction (HIP-423) primitives.
 * @license Apache-2.0
 */`,
    },
});
