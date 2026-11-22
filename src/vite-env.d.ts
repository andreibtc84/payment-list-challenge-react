/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 'true' turns on the MSW mock API in a production build (the GitHub Pages deploy).
  readonly VITE_ENABLE_MOCKS?: string
}
