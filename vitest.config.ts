import { defineConfig } from 'vitest/config';

// Unit tests cover the pure functions in `src/lib/` and run in node. Render
// tests (`src/**/*.test.tsx`) opt into happy-dom with a per-file
// `// @vitest-environment happy-dom` pragma. Nothing here touches the network,
// a wallet, or a real contract.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
