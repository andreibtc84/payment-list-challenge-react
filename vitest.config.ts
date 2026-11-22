import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Extends vite.config.ts, so the React plugin and `@/` alias are declared once.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      reporters: ['junit', 'verbose'],
      environment: 'jsdom',
      globals: true,
      // Dates render in local time; a fixed zone lets tests assert the exact text on any machine.
      env: { TZ: 'UTC' },
      outputFile: {
        junit: './junit.xml',
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      },
    },
  }),
);
