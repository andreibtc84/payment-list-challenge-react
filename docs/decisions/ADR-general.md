# General decisions

Architecture and tooling decisions that span several steps.

| # | Decision |
|---|---|
| 1 | [The React Compiler does the memoisation](#1-the-react-compiler-does-the-memoisation) |
| 2 | [Observability: structured events to a swappable sink](#2-observability-structured-events-to-a-swappable-sink) |

---

## 1. The React Compiler does the memoisation

**Context.** React re-renders are cheap, but some values need a stable identity. For example, the `filters` object from `usePaymentFilters` must stay the same object until the URL changes. Up to Step 3 that took one hand-written `useMemo`. Writing `useMemo`, `useCallback` and `React.memo` by hand is easy to get wrong, with missed dependencies or memoising things that don't need it.

**Decision.**
- Enable the React Compiler 1.0 (`babel-plugin-react-compiler`, pinned exactly) through `@vitejs/plugin-react`'s `babel.plugins`. Vitest reuses the Vite config, so tests run compiled code too.
- No manual memoisation in the codebase. The one `useMemo` is removed.
- `eslint-plugin-react-hooks` 7, whose `recommended` preset adds the compiler's lint rules (for example `set-state-in-render`, `refs`, `purity`).

**Alternatives.**
- Keep the `useMemo` and add no compiler. No new build step, but manual memoisation stays the rule for new code.
- Enable the compiler but keep the existing `useMemo`. This is React's conservative advice for existing code ("leave it in place, or carefully test before removing"). Here the test exists, so the line went.

**Consequences.**
- Every component and hook compiles, with no bail-outs.
- A test checks that `filters` keeps its identity while the URL is unchanged. On a copy of the repo, removing the `useMemo` without the compiler fails that test, and with the compiler it passes.
- Measured cost:
  - builds take about 0.2s longer;
  - the test run takes about 0.7s longer, because Babel now transforms each file;
  - the bundle grows by 4.6 kB (0.2 kB gzipped).
- If the compiler ever skips a component, that component is simply not memoised. The identity test catches it where it matters.
- Upgrading to `@vitejs/plugin-react` 6 means moving the plugin to `@rolldown/plugin-babel` with `reactCompilerPreset()`, because v6 removed the inline `babel` option.

---

## 2. Observability: structured events to a swappable sink

**Context.** The site is static on GitHub Pages and the API is mocked in the browser, so there are no server logs. Failed or slow requests, crashes, errors in event handlers and slow pages were invisible.

**Decision.** Keep it simple: just log.
- One `track(event, level, fields)` function. Event names are a fixed TypeScript union. Every event gets a timestamp, the app version (the commit SHA from CI, through a Vite `define`), the environment, a per-load session ID and the path without the query string. Messages are cut to 200 characters.
- One swappable sink; the default logs each event to the console at its level as `[telemetry] <event name>`, followed by the object to expand. Tests swap in a spy, and the test setup installs a silent sink.
- Sources:
  - `fetchPayments` times each request and logs success or failure with outcome, status class and status, then rethrows. 404 is `warn`, other failures are `error`.
  - The payments page handlers log search, currency, clear and page changes, never the search term.
  - An error boundary around the payments page shows "Something went wrong!" as an alert and logs the crash.
  - React's root `onUncaughtError` and `onRecoverableError`, in every environment.
  - `window` `error` and `unhandledrejection` listeners, for errors React never sees.
  - `web-vitals` 6.2.3 (attribution build): LCP, INP, CLS, FCP and TTFB with their rating and the slow element or phase. Only flat fields; no raw entries or URLs.

**Alternatives.**
- Docs only. Nothing to show.
- A vendor SDK (Sentry, Datadog). Real dashboards, but a key in a public repo, a third-party script and consent questions, all for mock data.
- OpenTelemetry's browser SDK. Its own docs call browser instrumentation experimental, and it needs a collector.
- A global TanStack Query `onError` for fetch errors. It fires once per failed query but has no duration and no success events.

**Consequences.**
- Nothing leaves the browser. A real transport would be another sink, with no change to the event sources.
- The bundle grows by about 6 kB gzipped, mostly `web-vitals/attribution`.
- CLS is reported only by Chromium browsers. A missing CLS in Firefox or Safari means no data, not zero.
- A crash can be logged twice, by React's root handler and by `window` `error`. That's accepted rather than de-duplicated.
- The error boundary is tested directly, with a child that throws, because that is the only way to trigger a render error on purpose.
