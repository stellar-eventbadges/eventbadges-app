import { defineConfig } from 'vitest/config';

// Unit tests cover the pure functions in `src/lib/` and run in node. Render
// tests (`src/**/*.test.tsx`) opt into happy-dom with a per-file
// `// @vitest-environment happy-dom` pragma. Nothing here touches the network,
// a wallet, or a real contract.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // The full suite is 25 files and Vitest runs them in parallel, each
    // spawning its own happy-dom environment. On a loaded machine the
    // userEvent-driven page tests can spend longer than the 5s default before
    // their first assertion, which showed up as different page tests failing
    // on different runs and passing in isolation. The extra headroom is for
    // scheduling, not for slow assertions: a genuinely stuck test still fails.
    testTimeout: 15_000,
  },
});
