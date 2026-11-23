# Spec: Step 5, Handle Server Error

## Goal

From the README:

> **Goal**: Display error message for server errors
> - Handle 500 responses from the API (use `pay_500` as the payment ID)
> - Display the appropriate error message from i18n
> - Ensure the error is clearly visible to users

Graded test: `App - Step 5: Handle Server Error` (`npm run test:step5`).

## Scope

- **In:**
  - What the page shows when a search gets a 500.
  - What it shows for any other failure (another HTTP status such as 401, a network error, or an unexpected non-HTTP error). Until now these left an empty table with no message.
  - Recovery and accessibility, which work the same as for "Payment not found." (Step 4).
- **Out:**
  - A "Try again" button or automatic retries. No i18n string exists for a button, and the starter turns retries off.
  - Telling a 401 apart from a lost connection in the UI. Both get the generic message.
  - Using the server's own error text: the README asks for the i18n constant.
  - Error reporting or monitoring.
  - The empty-results message, the currency filter (Step 6) and pagination (Step 8).

## User-facing behaviour

- **When it shows:**
  - A search the API answers with 500 (e.g. `pay_500`) shows "Internal server error. Please try again later." in the same light-red box as "Payment not found.", as in the screenshot.
  - Any other failed request shows "Something went wrong!" in the same box. Before this step, those failures left an empty table with no explanation.
  - Both messages appear whether the search came from Search, Enter, or a link opened with `?search=…`.
- **What stays and what goes:**
  - The box takes the table's place, and no old rows stay under it.
  - The heading, the search box (still holding the searched ID) and Clear Filters stay.
  - Focus doesn't move.
- **Recovery:** Clear Filters, a new valid search, and Back/Forward all work as they do for "Payment not found.".
- **Look and accessibility:**
  - Same box, colours (5.3:1), icon and status region as Step 4. Only one message shows at a time.
  - The longer server-error text wraps onto two lines at 320px without sideways scrolling.

## Design

On any failed query, `PaymentsPage` hands the error to `getErrorMessage` in the API module, as in Step 4. Inside, a small map turns an HTTP status into its i18n text: 404 → "Payment not found.", 500 → "Internal server error. Please try again later.". Anything the map doesn't cover gets "Something went wrong!". "No error" (`null`) gives no message. The page didn't need to change: it already shows whatever message comes back, in place of the table.

![Step 5 system design. In the browser, main.tsx starts the MSW worker and renders App, which provides the TanStack Query client. App renders PaymentsPage. PaymentsPage reads the applied search from usePaymentFilters, which reads and writes the URL's ?search=, renders SearchForm, uses lib/format and the ui components, and calls usePayments, a useQuery hook with keepPreviousData, which calls fetchPayments in api/payments to send GET /api/payments. When the query fails, PaymentsPage passes the error to getErrorMessage in api/payments, which maps 404 to the Payment not found message, 500 to the Internal server error message, and any other failure to Something went wrong; the page shows it in its always-rendered status region in place of the table. The MSW service worker answers from the mock handlers, which return 404 for pay_404, 500 for pay_500 and 401 for 401. In tests, Vitest with jsdom runs a setup file with jest-dom matchers and a URL reset. PaymentsPage.test runs one shared set of error tests for the 404, 500 and fallback cases against the MSW Node server, usePaymentFilters.test tests the hook, format.test unit-tests lib/format, and payments.test unit-tests getErrorMessage for every case with real axios errors.](step-5-system-design.svg)

CI now runs the graded Step 1–5 tests (`-t "Step 1:|Step 2:|Step 3:|Step 4:|Step 5:"`) as well as lint, `tsc -b`, our tests and the build.

- **`src/api/payments.ts`:** `getErrorMessage` keeps its signature (`(error: unknown) => string | undefined`). A `MESSAGE_BY_STATUS` map replaces the single 404 check, with the generic message as the default.
- **`src/components/PaymentsPage.tsx`:** only a comment changed ("any error message").
- **Unchanged:** `fetchPayments`, `usePayments`, `SearchForm`, the URL hook and the mock handlers. The handlers already answer `pay_500` with 500 and `401` with 401. Retries stay off, as the starter sets them, so a 500 shows straight away.

The reasoning behind each choice is in [Step 5 decisions](../decisions/ADR-step5.md).

## Testing

- **Page seam:** `src/components/PaymentsPage.test.tsx`. The Step 4 "payment not found" tests became one shared `describe.each` block, run three times: `pay_404` with "Payment not found.", `pay_500` with the server-error message, and `401` with "Something went wrong!". Each run checks the same 10 behaviours:
  - the message lands in the status region that existed before the search (click and Enter)
  - the table is gone, while the heading, the searched ID and Clear Filters stay
  - focus stays put
  - a page load with the ID in the URL shows the message
  - Clear Filters, or a new valid search, removes the message
  - Back/Forward
- **Unit seam:** `src/api/payments.test.ts` tests `getErrorMessage` with errors built from axios's own `AxiosError` class:
  - 404 → not found
  - 500 → server error
  - 401, a network error and a plain `Error` → the generic message
  - `null` → nothing
- The 500 and generic-message unit tests failed before the code changed. The page tests for 500 passed as soon as the helper did, because the page already rendered whatever the helper returns, so they guard that behaviour from now on.
- `src/App.test.tsx` is unchanged.

## Acceptance criteria

- [x] Searching `pay_500` shows "Internal server error. Please try again later." from the i18n constants, in place of the table, as in the screenshot.
- [x] Any other failed request shows "Something went wrong!" the same way, so no failure leaves a silent empty table.
- [x] The message is announced through the existing status region, focus doesn't move, and recovery works as in Step 4.
- [x] Nothing scrolls sideways at 320px (checked in headless Chromium).
- [x] `npm run test:step1` to `test:step5` pass, our 113 tests pass, and `tsc -b`, lint and the build pass.
- [x] CI runs the graded Step 1–5 tests.

## Known limits

- Like the not-found message, the server-error message is announced politely, not as an alert. A server failure is arguably more urgent, but keeping one polite region avoids two competing live regions. It hasn't been checked with a real screen reader.
- The generic message hides the cause: a 401 and a lost connection look the same.
- The 320px check was a one-off headless Chromium run, not part of the test suite.
- The box keeps Step 4's look (icon, border, half width from 640px up), which goes beyond the README screenshot's plain full-width box.
