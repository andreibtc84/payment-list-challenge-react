# Spec: Step 1, Basic Payment List

## Goal

From the README:

> **Goal**: Fetch and display payments in a table with proper formatting
> - Fetch payments from the API with `page=1` and `pageSize=5`
> - Display payments in a table with headers using i18n strings (see `src/constants/i18n.ts`)
> - Format amounts and dates as per the example in the screenshot

Graded test: `App - Step 1: Basic Payment List` (`npm run test:step1`).

## Scope

- **In:** fetching the first page, the table, amount and date formatting, status badges, the loading state, and WCAG 2.2 AA for all of these.
- **Out:** search, clear filters, 404/500 messages, the currency filter and pagination (Steps 2–8). Also error and empty states, currency-aware amounts, a time-zone setting, runtime validation of responses, and request cancellation.

## User-facing behaviour

- On load, the page requests `GET /api/payments?page=1&pageSize=5` and shows the payments under an "All payments" heading (`h2`, below the `h1` Checkout.com).
- **Columns:** six header cells from `I18N`, in the screenshot's order: Payment ID, Date, Amount, Customer, Currency, Status.
- **Amount:** two decimals and no currency symbol, e.g. `250.00` and `150.50`. The screenshot shows `200.00` even for JPY.
- **Date:** `dd/MM/yyyy, HH:mm:ss` in the viewer's local time, inside `<time dateTime>` holding the original UTC value. A date that isn't a string date-fns `parseISO` accepts (e.g. `null`, `April 15 2024`, `2024-02-30T10:00:00Z`) is shown as its raw text, without `<time>`.
- **Status:** a badge whose text is the status word, so colour is never the only signal. Each pair passes AA contrast:
  - `completed` is green, `#166534` on `#d1fae5` (6.29:1).
  - `pending` is amber, `#92400e` on `#fef3c7` (6.37:1).
  - `failed` is red, `#b91c1c` on `#fee2e2` (5.30:1).
  - `refunded` is neutral grey, `#374151` on `#f3f4f6` (9.37:1).
- **Loading:**
  - A skeleton table with the same columns and 5 rows, hidden from assistive tech. Its pulse stops under `prefers-reduced-motion`.
  - An always-present, visually hidden `role="status"` region says "Loading payments…" (`I18N.LOADING_PAYMENTS`), and is empty once the data arrives.
- **Accessibility:**
  - The table is named by the heading.
  - On narrow screens (320px, 400% zoom) the table scrolls sideways inside a keyboard-focusable region, named after the heading, with a visible focus outline.

## Design

Data flows from `PaymentsPage` through `usePayments` and `fetchPayments` to axios and `GET /api/payments`. MSW serves that endpoint: a service worker in the browser (in dev, and in the GitHub Pages build, which has no backend), and a Node server in tests.

![Step 1 system design. In the browser (Vite dev server, or the GitHub Pages build), PaymentsPage uses lib/format (formatAmount, formatDate, and isValidDate, which uses date-fns parseISO; bad dates are shown as raw text) and the ui components, and calls usePayments, then fetchPayments, which sends GET /api/payments; the MSW service worker answers from the mock handlers. In tests, PaymentsPage.test renders the page against the MSW Node server, which uses the same handlers, and format.test unit-tests lib/format.](step-1-system-design.svg)

Every pull request and push to `main` runs CI on GitHub Actions: `npm ci`, lint, `tsc -b`, our test files, the graded tests for finished steps only, and `vite build`. On `main`, once those pass, a deploy job builds with `BASE_PATH=/<repo>/` and `VITE_ENABLE_MOCKS=true` and publishes `dist` to GitHub Pages.

- **`src/types/payment.ts`:**
  - `PaymentStatus` is a union of the four statuses.
  - `Payment` follows the README. `clientId` is optional, because the mock data doesn't have it.
  - `Pagination` holds `{ page, pageSize }`, and `PaymentSearchResponse` extends it.
- **`src/api/payments.ts`:** `fetchPayments(params)` calls `axios.get(API_URL, { params })`. It has no React.
- **`src/hooks/usePayments.ts`:** `usePayments(params)` wraps TanStack Query `useQuery`, with the key `['payments', params]`.
- **`src/lib/format.ts`:** `formatAmount`, `formatDate` and `isValidDate`, all pure functions.
- **`src/constants`:** `DEFAULT_PAGE = 1` and `PAGE_SIZE = 5`, next to `API_URL`. One new i18n key, `LOADING_PAYMENTS`.
- **`src/components/ui/`:** shadcn/ui `table`, `badge` and `skeleton`, copied from the v3 registry onto the provided Tailwind v3. Our edits:
  - `Badge` has one variant per status.
  - `Table` takes `containerProps` for the scroll region.

The reasoning behind each choice is in [Step 1 decisions](../decisions/ADR-step1.md).

## Testing

- **Page seam:** `src/components/PaymentsPage.test.tsx`.
  - Each test renders `<PaymentsPage />` with a fresh `QueryClient`, and MSW serves data over the real axios path.
  - Queries use roles and accessible names only.
  - Expected values are literals from the README, the screenshot or the mock data.
  - The tests cover:
    - the first row's cells;
    - the exact date text and `<time>`;
    - an unparseable date shown raw, without `<time>`;
    - the request params and 5 rows;
    - loading announced and the skeleton hidden;
    - the column headers in order;
    - every status word in its badge;
    - the table's name;
    - the focusable named region.
- **Unit seam:** `src/lib/format.test.ts` covers amounts (`250`, `150.5`, `0`, `1234567.891`), two valid dates, unparseable dates returned unchanged, and which values `isValidDate` accepts and rejects.
- Tests run in UTC (`test.env` in `vitest.config.ts`), so date assertions are exact on any machine.
- `src/App.test.tsx` is unchanged. Our `describe` names don't start with `Step N:`, so the graded filters skip them.

## Acceptance criteria

- [x] One request with `page=1` and `pageSize=5`, and 5 data rows.
- [x] The six headers come from `I18N`, in the screenshot's order.
- [x] Amounts show two decimals, and dates show `dd/MM/yyyy, HH:mm:ss` in local time.
- [x] Each status badge shows its word, and every colour pair is at least 4.5:1.
- [x] Loading is announced, and the skeleton is hidden from assistive tech.
- [x] The table is named "All payments", and its scroll region is keyboard-focusable.
- [x] `npm run test:step1` passes, our tests pass, and `tsc -b` and the build pass.
- [x] Lint passes, with the inherited issues switched off only in the two files that have them.
- [x] CI runs lint, the typecheck, our tests, the graded Step 1 test and the build on every pull request and push to `main`.
- [x] Pushes to `main` that pass CI deploy to GitHub Pages, with the mock API running in the browser.

## Known limits

- The hosted site has no backend: MSW answers `/api/payments` in the browser with the mock data. The first visit registers a service worker before the page renders.
- An unknown status from the API at runtime isn't handled. That needs response validation.
- `toFixed` rounds the binary float: `1.005` shows as `1.00`. The real fix is amounts in minor units.
- Badge colours aren't asserted by tests. They're checked by contrast calculation and in the browser.
- The same payment shows different clock times in different time zones, because the app uses local time.
- One extra Tab stop on the scroll region, even when nothing overflows.
