// jest-dom matchers (toBeInTheDocument etc.) for every test
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { setTelemetrySink } from '../lib/telemetry'

// Silent sink per test: no console flood, and no test's sink leaks into the next.
beforeEach(() => {
  setTelemetrySink(() => {})
})

// The URL holds the filters, so reset it or one test's search leaks into the next (graded ones too).
afterEach(() => {
  window.history.replaceState(null, '', '/')
})
