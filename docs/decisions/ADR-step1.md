# Step 1 decisions: basic payment list

The architecture and code decisions behind Step 1.

| # | Decision |
|---|---|
| 1 | [shadcn/ui on the provided Tailwind v3, with a native `<select>`](#1-shadcnui-on-the-provided-tailwind-v3-with-a-native-select) |
| 2 | [Tests at the page seam](#2-tests-at-the-page-seam) |
| 3 | [TanStack Query for server state](#3-tanstack-query-for-server-state) |
| 4 | [An HTTP layer and a hook layer, on axios](#4-an-http-layer-and-a-hook-layer-on-axios) |
| 5 | [Payment status as a union type, one badge variant per status](#5-payment-status-as-a-union-type-one-badge-variant-per-status) |
| 6 | [Loading: hidden skeleton plus a screen-reader status](#6-loading-hidden-skeleton-plus-a-screen-reader-status) |
| 7 | [The table's scroll container is a focusable, named region](#7-the-tables-scroll-container-is-a-focusable-named-region) |
| 8 | [Tests run in UTC; the date test asserts exact text](#8-tests-run-in-utc-the-date-test-asserts-exact-text) |
| 9 | [The Vitest config extends the Vite config](#9-the-vitest-config-extends-the-vite-config) |
| 10 | [CI on GitHub Actions](#10-ci-on-github-actions) |
| 11 | [GitHub Pages hosting, with the mock API in the browser](#11-github-pages-hosting-with-the-mock-api-in-the-browser) |

---

## 1. shadcn/ui on the provided Tailwind v3, with a native `<select>`

**Context.** The starter mixes Tailwind (in `App.tsx`) and styled-components. Later steps need a table, badges, inputs, buttons and a currency filter. The challenge's tests find the currency filter by the `combobox` role and drive it with `fireEvent.change`.

**Decision.**
- Build the UI with shadcn/ui components on the Tailwind CSS v3 that the challenge ships. The build setup (`tailwind.config.js`, PostCSS, autoprefixer) stays as provided.
- Copy the components (`table`, `badge`, `skeleton`) from the v3 registry into `src/components/ui/`. Each file has a header naming its source. The `shadcn@2.3.0` CLI for Tailwind v3 currently writes invalid colour CSS (`hsl(oklch(…))`, shadcn-ui/ui#10254), so it isn't used.
- Define only the colour tokens these components use (`muted`, `muted-foreground`, `primary`), mapped to the starter's greys, as HSL channels so Tailwind opacity modifiers like `bg-muted/50` keep working.
- The currency filter will be a native `<select>` styled with Tailwind, not shadcn's Radix `Select`.
- The starter styled-components stay, marked deprecated. The template's global element styles in `index.css` are commented out because they break the badges.

**Alternatives.**
- Upgrade to Tailwind v4 for the current shadcn CLI. Rejected: it rewrites the provided build setup, and nothing in the challenge needs v4.
- Keep styled-components. Rejected: two styling systems side by side.
- Radix `Select`. Rejected: it renders a button and a listbox, so `fireEvent.change` doesn't work and the tests can't drive it.

**Consequences.**
- Copied components are our code. We can edit them (badge variants, a scroll-wrapper prop), but registry updates have to be merged by hand.
- The new `tailwind-merge` is pinned to 2.6.0. Version 3 targets Tailwind v4 class names.

## 2. Tests at the page seam

**Context.** `src/App.test.tsx` is the challenge's test file and stays unchanged. Our tests need to catch wrong request parameters, wrong formatting and missing accessibility semantics, without breaking on internal refactors.

**Decision.**
- Our tests render `<PaymentsPage />` with a fresh `QueryClient` per test. MSW serves the mock data over the real axios path.
- Queries use roles and accessible names only. There are no class assertions and no `data-testid`s.
- Expected values are literals from the README, the screenshot or the mock data, never computed by app code.
- Test names start with "should". Same-shape cases use `it.each` (one case per column, one per status).
- The page tests also check what the graded test doesn't: the headers are real `th` cells in the screenshot order, and every status is written as text in its badge, so the meaning never depends on colour alone.
- The formatters (`formatAmount`, `formatDate`) and `isValidDate` are pure functions in `src/lib/format.ts`, unit-tested with literal values.
- An unparseable date is shown as raw text, without `<time>`, instead of throwing and taking the page down. Parseable means a string date-fns `parseISO` accepts. `new Date()` isn't used: it turns `null` into 1970 and rolls `2024-02-30` over to 1 March, and a plausible wrong date is worse than a raw one.
- No unit tests for components. The `ui/` files are copied shadcn wrappers, and in jsdom a badge test could only check class names.

**Alternatives.**
- Render `<App />`. Rejected: `App` creates one `QueryClient` at module level. Tests would share its cache, so the loading test would depend on test order.
- Format checks only through the page. Rejected: a failure says less about what broke, and the invalid-date case is clearer as a unit.

**Consequences.**
- Tests survive refactors, and they read the page the way a screen reader does.
- Badge colours aren't asserted, because jsdom doesn't render. They're checked by contrast calculation and in the browser. Real-browser tests (`toHaveCSS` or screenshots) are the next step.
- `toFixed` rounds the binary float (`1.005` shows as `1.00`). The mock data has no such amounts. The real fix is amounts in minor units from the API.
- Our `describe` names don't start with `Step N:`, so they stay out of the challenge's `-t "Step N:"` filters.

## 3. TanStack Query for server state

**Context.** The payment list is server state, and later steps add search, filters, pagination and error states. `@tanstack/react-query` is already installed and wired up in `App.tsx`.

**Decision.**
- Fetch with `useQuery`.
- The query key is `['payments', params]`: a fixed prefix plus one params object. Filters join that object later, and invalidating `['payments']` matches every page and filter.

**Alternatives.**
- SWR. Adequate, but not installed.
- `useEffect` plus `useState`. Rejected: we'd hand-roll loading and error states, race handling and caching.
- `useSuspenseQuery` with React Suspense. Rejected: the fallback unmounts the loading live region, which must stay mounted so later loads are announced, and every search or page change would swap the table for the fallback unless wrapped in `startTransition`. With one query in one component, the gain is small.
- A positional key, `['payments', page, pageSize]`. Rejected: the meaning depends on position, and it becomes a long ordered list as filters arrive.

**Consequences.**
- `isPending` drives the loading UI. Errors stay values (`isError`, `error`) for the error states in later steps, with no error boundary.
- Each page and filter combination is cached separately. Pagination can keep the previous page visible with `placeholderData`.

## 4. An HTTP layer and a hook layer, on axios

**Context.** The page needs `GET /api/payments` with query parameters, and later steps must tell a 404 from a 500. axios is already installed.

**Decision.**
- `src/api/payments.ts`: `fetchPayments(params)` calls `axios.get(API_URL, { params })` and contains no React.
- `src/hooks/usePayments.ts`: `usePayments(params)` wraps `useQuery`.
- `page` and `pageSize` are a shared `Pagination` type. The response extends it. The request params use it under their own name (`PaymentQueryParams`), so filters can be added to the request without touching the response type.
- `DEFAULT_PAGE = 1` and `PAGE_SIZE = 5` live in `src/constants` next to `API_URL`.

**Alternatives.**
- Native `fetch` with a typed error class. No dependency, but we'd check `response.ok`, build the query string and parse JSON by hand.
- Fetching inline in the page. Rejected: the page would grow with every step and mix HTTP with UI.
- The response type extending the request params. Rejected: once filters are added, the response would wrongly inherit them.

**Consequences.**
- axios rejects any non-2xx response, and `isAxiosError(error) && error.response?.status` gives the status for the error messages.
- About 13 kB gzipped for axios.

## 5. Payment status as a union type, one badge variant per status

**Context.** The mock data has four statuses: `completed`, `pending`, `failed` and `refunded`. The starter's badge treats anything unknown as red, so `refunded` would read as "failed". The starter's completed colour (`#15803d` on `#d1fae5`) is 4.42:1, below WCAG AA's 4.5:1.

**Decision.**
- `type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded'`.
- Each status is a `cva` variant in our copied `Badge`, and the page renders `<Badge variant={payment.status}>`. TypeScript checks the variant against the union.
- Colours keep the starter's design, with completed text darkened to `#166534` (6.29:1). Refunded gets a neutral grey (9.37:1). Pending is 6.37:1 and failed is 5.30:1.
- The status word is always visible, so colour isn't the only signal (WCAG 1.4.1).

**Alternatives.**
- Keep the starter's ternary. Rejected: unknown statuses fall through to red.
- Colour the badge through `className`. Rejected: shadcn's default `hover:` class survives `tailwind-merge`, so the badge would darken on hover.

**Consequences.**
- A new status won't compile until it gets a variant.
- An unknown status from the API at runtime isn't handled yet. That needs response validation.

## 6. Loading: hidden skeleton plus a screen-reader status

**Context.** The first load needs feedback that doesn't jump the layout, makes sense to screen-reader users, and doesn't let a test pass before the data arrives.

**Decision.**
- While loading, a skeleton table with the real column headers is shown, marked `aria-hidden="true"`. Its pulse stops under `prefers-reduced-motion`.
- A visually hidden `role="status"` / `aria-live="polite"` region is always rendered. It says "Loading payments…" while pending and is empty otherwise. A live region has to exist before its text changes to be announced reliably.

**Alternatives.**
- A spinner. Simpler, but the layout jumps when the table appears.
- A visible skeleton with real table semantics. Rejected: screen readers would read rows of empty cells, and a "6 rows" assertion would pass on placeholders.

**Consequences.**
- Later loads (search, pagination) reuse the same region, so they're announced.
- On the very first load the region and its text render together, so that one announcement isn't guaranteed.

## 7. The table's scroll container is a focusable, named region

**Context.** At 320px wide, or 400% zoom, the six-column table scrolls sideways. WCAG 1.4.10 (Reflow) allows that for data tables, but keyboard users must be able to scroll it (2.1.1).

**Decision.**
- The table's wrapper is `role="region"`, `aria-labelledby` the "All payments" heading, `tabIndex={0}`, with a visible gray-900 focus outline (17.74:1).
- The table is named by the same heading.

**Alternatives.**
- `tabIndex` alone, with no role or name. Rejected: a focused, unnamed element gives screen-reader users no context.
- Rely on browsers making scrollers focusable by default. Rejected: Chrome and Firefox do, but Safari's behaviour wasn't verified.

**Consequences.**
- One extra Tab stop, even when nothing overflows.
- "All payments" names both the region and the table. This follows the established responsive-table pattern, where the region is labelled by the table's own caption. Not yet tested with a screen reader.

## 8. Tests run in UTC; the date test asserts exact text

**Context.** Dates render as `dd/MM/yyyy, HH:mm:ss` in the viewer's local time. A pattern-only assertion would miss swapped day and month, or a 12-hour clock, because every mock payment on page 1 is between 09:00 and 12:00 UTC.

**Decision.**
- `vitest.config.ts` sets `test.env: { TZ: 'UTC' }`, so every test run uses UTC, whatever the machine's zone.
- The date test serves its own payment, `2024-04-03T14:05:09Z`, and asserts exactly `03/04/2024, 14:05:09`, plus `datetime="2024-04-03T14:05:09Z"` on the `<time>` element.

**Alternatives.**
- `TZ=UTC` in the npm script. Rejected: `npx vitest` and IDE runners would skip it.
- Build the expected text from `Date` getters. Rejected: the 12-hour bug would only fail on some machines, and the expected value would be computed, not a literal.

**Consequences.**
- The test fails for `MM/dd`, `hh` and swapped minutes and seconds. This was checked by deliberately breaking the format.
- A bug that only shows outside UTC (formatting in UTC instead of local time) isn't caught by tests.

## 9. The Vitest config extends the Vite config

**Context.** The `@/` alias and the React plugin are needed by both the build and the tests.

**Decision.** `vitest.config.ts` exports `mergeConfig(viteConfig, defineConfig({ test: { … } }))`. The alias and plugins are declared once, in `vite.config.ts`.

**Alternatives.** A standalone test config that repeats the alias and plugins. Rejected: the two could drift apart silently.

**Consequences.**
- The test run also inherits the dev-server block. That's harmless, because `vitest run` starts no dev server for jsdom tests.
- Build settings that only belong to the build need care, because tests inherit them.

## 10. CI on GitHub Actions

**Context.** Every change to `main` should prove that lint, types, tests and the build pass. The challenge's own test file contains tests for all eight steps, so later steps fail until they're built. The template also has a few inherited lint errors in files that stay unchanged for now.

**Decision.**
- `.github/workflows/ci.yml` runs on every PR to `main` and every push to `main`, on the Node version in `.nvmrc`.
- Steps: `npm ci`, lint, `tsc -b`, our test files in full, the challenge's tests for finished steps only (`-t "Step 1:"`, widened as each step is finished), and `vite build`.
- `npm ci` and `vitest run` are called directly. `npm test` runs `npm install` first, which can rewrite the lockfile.
- Lint stays blocking. The generated MSW worker isn't linted. The two inherited errors in the challenge's test file and the mock handlers are switched off for those files only.
- The token is read-only, and a new push to a PR cancels the run it replaces.

**Alternatives.**
- Run the whole suite and accept red until Step 8. Rejected: a permanently red check hides real failures.
- Let lint fail without blocking. Rejected for the same reason.
- Rely on a hosting provider's build. Rejected: it builds, but doesn't lint or test.

**Consequences.**
- Finishing a step includes widening the graded-test filter.
- New `any`s in the mock handlers wouldn't be caught. That's acceptable while those files stay unchanged.
- No `npm audit` gate: the inherited dependency tree has open advisories that would fail every run.

## 11. GitHub Pages hosting, with the mock API in the browser

**Context.** Reviewers should be able to open a live URL. The app has no real backend: `/api/payments` exists only as MSW handlers, which the starter enabled in development only.

**Decision.**
- Host on GitHub Pages. A `deploy` job in the CI workflow runs on pushes to `main`, only after every check passes (`needs: quality`). Only that job gets the Pages permissions.
- The Pages build sets `VITE_ENABLE_MOCKS=true`, so MSW's service worker answers `/api/payments` in the browser. Without the flag, a production build starts no mocks.
- Pages serves the app under `/<repo>/`, so the build sets Vite's `base` from `BASE_PATH`, and the worker is loaded from `${import.meta.env.BASE_URL}mockServiceWorker.js`. Dev and tests keep `/`.

**Alternatives.**
- Vercel or Netlify. They work with Vite with no config and give a preview URL per PR, but they need a third-party account, and the setup lives outside the repo.
- Docker with nginx. Good packaging, but no hosted URL on its own.
- A separate deploy workflow. It would run alongside CI, so a failing commit could still go live.

**Consequences.**
- The live site is a demo on mock data. The first visit registers a service worker before the page renders.
- No preview deploys for PRs.
- The deploy rebuilds, because the Pages build differs from the CI build (base path and the mock flag).
- Checked locally on the built output in headless Chrome: with the flag, the API answers from the service worker and 5 rows render. Without the flag, the API returns 404 and the table is empty.
