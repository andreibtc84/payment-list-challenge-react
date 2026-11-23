# Spec: Step 4, Handle Payment Not Found

## Goal

From the README:

> **Goal**: Display appropriate error message when payment is not found
> - Handle 404 responses from the API (use `pay_404` as the payment ID)
> - Display the error message from i18n constants
> - Show the error message in a user-friendly way

Graded test: `App - Step 4: Handle Payment Not Found` (`npm run test:step4`).

## Scope

- **In:** what the page shows when a search gets a 404, how screen readers learn about it, how the user recovers (Clear Filters, a new search, Back/Forward), its styling, and WCAG 2.2 AA for all of these.
- **Out:**
  - 500 errors and any other failure (401, network): Step 5. Until then they show an empty table, as before.
  - The empty-results message ("No payments found.") for a successful search with no rows: not in the Step 4 requirements.
  - Error logging or monitoring: a 404 is an expected answer to a search, not a fault.
  - Retry buttons, and using the server's own error text (the README asks for the i18n constant).

## User-facing behaviour

- **When it shows:**
  - A search the API answers with 404 (e.g. `pay_404`) shows "Payment not found." in a light-red box, as in the screenshot. This works whether the search came from Search, Enter, or a link opened with `?search=pay_404`.
  - While the request is in flight, the previous rows stay on screen, dimmed, as for any search.
- **What stays and what goes:**
  - The box takes the table's place, so no empty headers show under it.
  - The heading, the search box (still holding `pay_404`) and Clear Filters stay.
  - Focus doesn't move: it stays on the Search button or the search box, whichever submitted.
- **Recovery:**
  - Clear Filters removes the message and shows the first 5 payments.
  - A new search for an existing Payment ID removes the message and shows that payment.
  - Back returns to the previous table, and Forward shows the message again.
- **Look:** Tailwind `bg-red-100` (`#fee2e2`) with `text-red-700` (`#b91c1c`), the starter's error colours, plus a thin `red-200` border and a small alert icon before the text. It's rounded and padded, and as wide as the search input: half the content width from 640px up, full width below. It wraps without sideways scrolling at 320px.
- **Accessibility:**
  - The message sits in the page's one status region (`role="status"`, polite), which is always rendered. The same region already carries the screen-reader "Loading payments…" text, and the two never show at once. Screen readers announce live-region content when it changes, which is why the region exists before the message arrives.
  - The text is 5.3:1 against its background. It reads on its own, without relying on the colour. The icon is decorative and hidden from screen readers.

## Design

`usePayments` (TanStack Query) rejects when axios gets a non-2xx response, so on a 404 the query returns an `error` and no `data`. `PaymentsPage` hands that error to `getErrorMessage`, which lives next to `fetchPayments` in the API module. It returns the i18n "Payment not found." for an axios 404 and nothing for any other error. When there's a message, the page renders it inside the status region and skips the table.

![Step 4 system design. In the browser, main.tsx starts the MSW worker and renders App, which provides the TanStack Query client. App renders PaymentsPage. PaymentsPage reads the applied search from usePaymentFilters, which reads and writes the URL's ?search=, renders SearchForm, uses lib/format and the ui components, and calls usePayments, a useQuery hook with keepPreviousData, which calls fetchPayments in api/payments to send GET /api/payments. When the query fails, PaymentsPage passes the error to getErrorMessage in api/payments, which returns the Payment not found message for a 404; the page shows it in its always-rendered status region in place of the table. The MSW service worker answers from the mock handlers, which return 404 for pay_404. In tests, Vitest with jsdom runs a setup file with jest-dom matchers and a URL reset. PaymentsPage.test drives the page with user-event against the MSW Node server, usePaymentFilters.test tests the hook, format.test unit-tests lib/format, and the new payments.test unit-tests getErrorMessage with real axios errors.](step-4-system-design.svg)

CI now runs the graded Step 1–4 tests (`-t "Step 1:|Step 2:|Step 3:|Step 4:"`) as well as lint, `tsc -b`, our tests and the build. Pushes to `main` that pass deploy to GitHub Pages, as before.

- **`src/api/payments.ts`:** new `getErrorMessage(error: unknown): string | undefined`. `fetchPayments` is unchanged.
- **`src/components/PaymentsPage.tsx`:**
  - Reads `error` from `usePayments` and asks `getErrorMessage` for the text.
  - The box has an inline SVG icon (`aria-hidden`) and uses `sm:w-1/2`, the same width class as the search input.
  - The existing status region is no longer `sr-only` itself. It holds an `sr-only` span with the loading text and, on a 404, the visible message box.
  - The table container renders only when there's no message.
- **`src/hooks/usePayments.ts`, `SearchForm`, the URL hook and the mock handlers:** unchanged. The handlers already answer `pay_404` with 404.

The reasoning behind each choice is in [Step 4 decisions](../decisions/ADR-step4.md).

## Testing

- **Page seam:** `src/components/PaymentsPage.test.tsx` adds 10 tests in a `PaymentsPage payment not found` block, with user-event, role/name queries and the MSW Node server.
  - The message lands inside the status region that existed before the search, by clicking Search and by pressing Enter (`it.each`).
  - The table is gone, while the heading, the searched ID in the box and Clear Filters stay.
  - Focus stays on the Search button after a click, and on the search box after Enter (`it.each`).
  - Opening `?search=pay_404` shows the message.
  - Clear Filters, or a new valid search, removes the message and brings rows back.
  - Back restores the previous table, and Forward shows the message again.
- **Unit seam:** `src/api/payments.test.ts` tests `getErrorMessage` with errors built from axios's own `AxiosError` class: 404 gives the message, while 500, 401, a network error, a plain `Error` and `null` give nothing (`it.each`).
- `src/App.test.tsx` is unchanged.

## Acceptance criteria

- [x] Searching `pay_404` shows "Payment not found." from the i18n constants, in place of the table, as in the screenshot.
- [x] The message is announced through a status region that exists before it changes, and focus doesn't move.
- [x] Clear Filters, a new search, and Back/Forward all recover as described.
- [x] The colours pass WCAG 2.2 AA (5.3:1), and nothing scrolls sideways at 320px.
- [x] `npm run test:step1` to `test:step4` pass, our 93 tests pass, and `tsc -b`, lint and the build pass.
- [x] CI runs the graded Step 1–4 tests.

## Known limits

- The announcement was checked through the accessibility tree and automated tests, not with a real screen reader (VoiceOver or NVDA).
- Treating "Payment not found." as a status message, rather than an alert, follows WCAG's "No results returned" example; WCAG doesn't name this exact case.
- Until Step 5, a 500, 401 or network error still shows an empty table with no message. (Fixed in [Step 5](step-5-handle-server-error.md).)
- The real-browser check (axe in Chrome at 1280, 887, 640 and 320px: no violations; the box's edges match the input's) was a manual run, not part of the test suite.
- The icon, border and narrower width go beyond the README screenshot, which shows a plain full-width box.
