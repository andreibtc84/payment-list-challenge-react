/// <reference types="vite/client" />

// The commit SHA from vite.config.ts `define`, or 'dev'.
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  // 'true' turns on the MSW mock API in a production build (the GitHub Pages deploy).
  readonly VITE_ENABLE_MOCKS?: string
}
