# Spec: Observability (across all steps)

**Status:** done.

The app has no backend: it's a static site with the API mocked in the browser. Observability here means seeing, in the visitor's browser, when requests fail or are slow, when the UI crashes, when an event handler or a promise fails, how fast the page is, and what people do. The rule was "keep it simple, just log".

## What is built

- **`track(event, level, fields)`** in `src/lib/telemetry.ts`: the only way to log.
  - It adds a timestamp, the app version (the commit SHA in CI builds, `dev` locally), the environment, a per-page-load session ID and the path without the query string.
  - It cuts any message to 200 characters.
  - It sends the event to a swappable sink. The default sink logs each event at its level (`console.info`, `console.warn` or `console.error`) as a `[telemetry] <event name>` line, followed by the object to expand.
- **Fetch events:** `payments_fetch_succeeded` (`info`) and `payments_fetch_failed` (`warn` for 404, `error` otherwise).
  - Fields: duration, outcome (`success`, `http_error`, `network_error`), status class (`2xx`, `4xx`, `5xx`, `network`), status, page, page size, currency, whether a search was applied, and the result count or error message.
  - The request still resolves or rejects exactly as before.
- **User actions:** `search_submitted` (whether a term was given), `currency_changed` (the code), `filters_cleared`, `page_changed` (the page).
- **Crash fallback:** an error boundary around the payments page. If rendering throws, "Something went wrong!" shows as an alert under the header, and `ui_render_failed` is logged with the error name, message and component stack. Reloading is the recovery.
- **Other errors:**
  - React's root handlers log `ui_uncaught_error` and `ui_recoverable_error` in every environment.
  - `window` listeners log `window_error` and `unhandled_rejection`.
- **Web vitals:** `web-vitals` 6.2.3 (attribution build) logs `web_vital` for LCP, INP, CLS, FCP and TTFB, with value, rating, delta, id, navigation type and the slow element or phase.

Never logged: the search term (it can be a customer's name), Payment IDs, the query string, raw performance entries.

## Tests

All tests watch the sink, which each test swaps for a spy; the setup file makes it silent by default.
- `telemetry.test`: the shared fields, the 200-character cap, the console sink's level mapping, the silent default, the root handlers, and the window listeners.
- `payments.test`: one event each for 200, 404, 500 and a network error, and failures still reject.
- `PaymentsPage.test`:
  - one success on load;
  - a 404 event while "Payment not found." shows;
  - no search term or query string in any event;
  - one event per user action.
- `ErrorBoundary.test`: a child that throws shows the alert and logs one event; normal children render.
- `webVitals.test`: with `web-vitals` mocked, each metric becomes one event without raw entries or URLs.

Each slice was proved with deliberate bugs on a copy of the repo, and each was caught. It was also checked in real Chrome on the production build:
- fetch, `web_vital`, `window_error` and `unhandled_rejection` events appear in the console;
- a payment with a `null` amount, served in place of the mock API, makes the row throw while rendering. The page shows "Something went wrong!" under the header, and `ui_render_failed` is logged with the error name, message and component stack. In production the component names are minified, so source maps are needed to read the stack.

## System diagram

The system after Step 8, with observability added as the dashed box.

![System design with observability. The system after Step 8, plus one new module, lib/telemetry. Its track function sends structured events to a sink that logs them to the browser console. Events come from fetchPayments (each request's outcome and duration), the PaymentsPage handlers (search, currency, Clear Filters, page change), an ErrorBoundary around PaymentsPage that shows Something went wrong, React's root error handlers, window error and unhandledrejection listeners, and web-vitals (LCP, INP, CLS, FCP, TTFB). In tests the setup file installs a silent sink.](observability-system-design.svg)

## Out of scope

Sending events anywhere (beacon, collector, vendor), sampling, source maps, session replay, request correlation, soft-navigation vitals, and a retry button on the crash message.
