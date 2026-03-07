import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.tsx'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    treeshake: true,
    external: ['react', 'react-dom', '@chronos-kit/core', '@tanstack/react-query'],
    esbuildOptions(options) {
        options.conditions = ['module'];
    },
    banner: {
        js: `/**
 * @chronos-kit/react
 * React hooks and Context providers for Chronos-Kit.
 * @license Apache-2.0
 */`,
    },
});
