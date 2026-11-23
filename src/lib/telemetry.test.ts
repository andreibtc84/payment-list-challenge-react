import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  consoleSink,
  installGlobalErrorListeners,
  rootErrorHandlers,
  setTelemetrySink,
  track,
  type TelemetryEvent,
} from './telemetry'

describe('installGlobalErrorListeners', () => {
  // Once, as in main.tsx.
  beforeAll(() => {
    installGlobalErrorListeners()
  })

  it('should log an error thrown outside React (for example in a click handler) as one window_error event', () => {
    const sink = vi.fn()
    setTelemetrySink(sink)

    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new TypeError('x is not a function'),
        message: 'Uncaught TypeError: x is not a function',
        filename: 'https://example.com/assets/index.js',
        lineno: 12,
        colno: 34,
      }),
    )

    expect(sink).toHaveBeenCalledOnce()
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'window_error',
        level: 'error',
        errorName: 'TypeError',
        message: 'x is not a function',
        filename: 'https://example.com/assets/index.js',
        line: 12,
        column: 34,
      }),
    )
  })

  // jsdom has no PromiseRejectionEvent; a plain Event carries the reason.
  it.each([
    ['an Error', new Error('fetch failed'), 'Error', 'fetch failed'],
    ['a non-Error value', 'nope', 'NonError', 'nope'],
  ])(
    'should log an unhandled promise rejection with %s as one unhandled_rejection event',
    (_case, reason, errorName, message) => {
      const sink = vi.fn()
      setTelemetrySink(sink)

      window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }))

      expect(sink).toHaveBeenCalledOnce()
      expect(sink).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'unhandled_rejection', level: 'error', errorName, message }),
      )
    },
  )
})

describe('rootErrorHandlers', () => {
  it.each([
    ['onUncaughtError', 'ui_uncaught_error'],
    ['onRecoverableError', 'ui_recoverable_error'],
  ] as const)('should log %s as one %s event', (handler, eventName) => {
    const sink = vi.fn()
    setTelemetrySink(sink)

    rootErrorHandlers[handler](new RangeError('Invalid time value'), {
      componentStack: '\n    at PaymentsPage',
    })

    expect(sink).toHaveBeenCalledOnce()
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        event: eventName,
        level: 'error',
        errorName: 'RangeError',
        message: 'Invalid time value',
        componentStack: '\n    at PaymentsPage',
      }),
    )
  })

  it('should log a thrown non-Error value by its text', () => {
    const sink = vi.fn()
    setTelemetrySink(sink)

    rootErrorHandlers.onUncaughtError('boom', {})

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({ errorName: 'NonError', message: 'boom', componentStack: '' }),
    )
  })
})

describe('the test setup', () => {
  it('should start every test with a silent sink, so nothing reaches the console', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})

    track('filters_cleared', 'info')

    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('consoleSink', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(['info', 'warn', 'error'] as const)(
    'should log a %s event with the console method of the same name, as a readable label then the object',
    (level) => {
      const log = vi.spyOn(console, level).mockImplementation(() => {})
      const event: TelemetryEvent = {
        event: 'filters_cleared',
        level,
        timestamp: '2026-11-23T09:30:00.000Z',
      }

      consoleSink(event)

      expect(log).toHaveBeenCalledWith('[telemetry] filters_cleared', event)
    },
  )
})

describe('track', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should send the event, its level, its fields and an ISO timestamp to the sink', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-23T09:30:00.000Z'))
    const sink = vi.fn()
    setTelemetrySink(sink)

    track('page_changed', 'info', { page: 2 })

    expect(sink).toHaveBeenCalledOnce()
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page_changed',
        level: 'info',
        timestamp: '2026-11-23T09:30:00.000Z',
        page: 2,
      }),
    )
  })

  it('should add the app version, environment and one session ID for the whole page load', () => {
    const sink = vi.fn()
    setTelemetrySink(sink)

    track('filters_cleared', 'info')
    track('filters_cleared', 'info')

    const [first, second] = sink.mock.calls.map(([event]) => event)
    // CI builds stamp the commit SHA; local runs have none.
    expect(first.appVersion).toBe(process.env.GITHUB_SHA ?? 'dev')
    expect(first.environment).toBe('test')
    expect(first.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(second.sessionId).toBe(first.sessionId)
  })

  it('should cut a message longer than 200 characters to 200', () => {
    const sink = vi.fn()
    setTelemetrySink(sink)

    track('window_error', 'error', { message: 'x'.repeat(300) })

    const [[event]] = sink.mock.calls
    expect(event.message).toBe('x'.repeat(200))
  })

  it('should add the path without the query string, which can hold the search term', () => {
    window.history.replaceState(null, '', '/payments?search=pay_134&currency=USD')
    const sink = vi.fn()
    setTelemetrySink(sink)

    track('search_submitted', 'info', { hasSearch: true })

    const [[event]] = sink.mock.calls
    expect(event.path).toBe('/payments')
    expect(JSON.stringify(event)).not.toContain('pay_134')
  })
})
