// jest-dom matchers (toBeInTheDocument etc.) for every test
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// The URL holds the filters, so reset it or one test's search leaks into the next (graded ones too).
afterEach(() => {
  window.history.replaceState(null, '', '/')
})
