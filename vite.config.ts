import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app under /<repo>/; the deploy job sets BASE_PATH, dev and tests keep '/'.
  base: process.env.BASE_PATH ?? '/',
  // React Compiler memoises components and hooks, so we write no useMemo/useCallback/memo.
  plugins: [react({ babel: { plugins: ['babel-plugin-react-compiler'] } })],
  // `@/` alias for the copied shadcn sources (as in shadcn's Vite guide); vitest.config.ts reuses it.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
      allowedHosts: [
        '.vm-provider.internal',
        'hrcdn.net'
      ]
  }
})
