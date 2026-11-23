import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18N } from '../constants/i18n'
import { setTelemetrySink } from '../lib/telemetry'
import { ErrorBoundary } from './ErrorBoundary'

// Tested on its own: throwing on purpose is the only way to trigger a render error.
const Throws = (): never => {
  throw new TypeError('Cannot read properties of undefined')
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should show "Something went wrong!" as an alert and log one ui_render_failed event when a child throws', () => {
    // Silences React's own log of the caught error.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const sink = vi.fn()
    setTelemetrySink(sink)

    render(
      <ErrorBoundary>
        <Throws />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(I18N.SOMETHING_WENT_WRONG)
    expect(sink).toHaveBeenCalledOnce()
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ui_render_failed',
        level: 'error',
        errorName: 'TypeError',
        message: 'Cannot read properties of undefined',
        componentStack: expect.stringContaining('Throws'),
      }),
    )
  })
})
