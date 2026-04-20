import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'shared/src/**/*.test.ts',
      'server/src/**/*.test.ts',
      'client/src/**/*.test.ts',
      'syntaxes/**/*.test.ts',
      'snippets/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'shared/src/**/*.ts',
        'server/src/**/*.ts',
        'client/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
      ],
    },
  },
});
