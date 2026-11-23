// Every event goes through track() to one swappable sink (the console for now).

export type TelemetryLevel = 'info' | 'warn' | 'error'

// A fixed list: a typo is a type error, not a new event.
export type TelemetryEventName =
  | 'payments_fetch_succeeded'
  | 'payments_fetch_failed'
  | 'ui_render_failed'
  | 'ui_uncaught_error'
  | 'ui_recoverable_error'
  | 'window_error'
  | 'unhandled_rejection'
  | 'web_vital'
  | 'search_submitted'
  | 'currency_changed'
  | 'filters_cleared'
  | 'page_changed'

type FieldValue = string | number | boolean

export interface TelemetryEvent {
  event: TelemetryEventName
  level: TelemetryLevel
  timestamp: string
  [field: string]: FieldValue
}

export type TelemetrySink = (event: TelemetryEvent) => void

const MAX_MESSAGE_LENGTH = 200

// Groups the events of one page load.
const sessionId = crypto.randomUUID()

// Label first, so each line is readable even when DevTools shows only "Object".
export const consoleSink: TelemetrySink = (event) => {
  console[event.level](`[telemetry] ${event.event}`, event)
}

let sink: TelemetrySink = consoleSink

export const setTelemetrySink = (next: TelemetrySink) => {
  sink = next
}

export const track = (
  event: TelemetryEventName,
  level: TelemetryLevel,
  fields: Record<string, FieldValue> = {},
) => {
  sink({
    event,
    level,
    timestamp: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    environment: import.meta.env.MODE,
    sessionId,
    // No query string: it holds the search term, which can be a customer's name.
    path: window.location.pathname,
    ...fields,
    // Capped, so a huge message can't flood the sink.
    ...(typeof fields.message === 'string' && {
      message: fields.message.slice(0, MAX_MESSAGE_LENGTH),
    }),
  })
}

// Anything can be thrown; a non-Error is logged by its text.
export const errorFields = (error: unknown) =>
  error instanceof Error
    ? { errorName: error.name, message: error.message }
    : { errorName: 'NonError', message: String(error) }

// Every React error: what was thrown, and where in the tree.
export const trackError = (
  event: Extract<TelemetryEventName, `ui_${string}`>,
  error: unknown,
  componentStack?: string | null,
) => track(event, 'error', { ...errorFields(error), componentStack: componentStack ?? '' })

// For createRoot: errors no boundary caught, and errors React recovered from.
export const rootErrorHandlers = {
  onUncaughtError: (error: unknown, errorInfo: { componentStack?: string }) =>
    trackError('ui_uncaught_error', error, errorInfo.componentStack),
  onRecoverableError: (error: unknown, errorInfo: { componentStack?: string }) =>
    trackError('ui_recoverable_error', error, errorInfo.componentStack),
}

// Errors React never sees (event handlers, timers, promises). No preventDefault(), so the browser still logs them.
export const installGlobalErrorListeners = () => {
  window.addEventListener('error', (event) =>
    track('window_error', 'error', {
      ...errorFields(event.error ?? event.message),
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    }),
  )
  window.addEventListener('unhandledrejection', (event) =>
    track('unhandled_rejection', 'error', errorFields(event.reason)),
  )
}
