import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ['./tsconfig.test.json'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    hookTimeout: 30000,
    testTimeout: 30000,
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.server.mjs'],
    include: ['src/**/*.test.ts', 'src/**/*.test.js'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/server',
    },
  },
}); 