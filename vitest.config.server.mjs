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
    name: 'server',
    globals: true,
    environment: 'node',
    include: ['src/app/api/**/*.test.{ts,js}', 'src/lib/**/*.test.{ts,js}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,playwright}.config.*',
      'tests/**',
      'src/models/player/Player.test.js',
      'src/components/**',
    ],
    setupFiles: ['./vitest.setup.server.mjs'],
    threads: false,
    isolate: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage/server',
    },
  },
}); 