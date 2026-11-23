# Spec: Step 8, Pagination

## Goal

From the README:

> **Goal**: Implement pagination functionality
> - Display pagination controls (Previous/Next buttons)
> - Show current page number (e.g., "Page 1")
> - Disable Previous button on first page
> - Enable Previous button after navigating to next page
> - Show different payments on different pages
> - Allow navigation back to previous pages

Graded test: `App - Step 8: Pagination` (`npm run test:step8`).

## Scope

- **In:**
  - Previous, "Page N" and Next below the table, and the current page in the URL.
  - Resetting to page 1 when the filters change, and what happens with a bad or past-the-end page.
  - Keyboard focus and screen-reader behaviour of the controls.
  - CI running the graded Step 8 test.
- **Out:**
  - A page-size choice, page-number links, first/last buttons and "of N" in the label.
  - Prefetching the next page, and a second set of controls above the table.
  - Changes to the mock API or its data.

## User-facing behaviour

- **Controls:** inside the table card, below the table, "◀ Previous" on the left, "Page 1" in the centre and "Next ▶" on the right. They show only with the table, not with an error message or the loading skeleton.
- **Paging:** Next shows the next 5 payments and the label changes to "Page 2"; Previous goes back. Search and currency are kept while paging. The request to `GET /api/payments` carries `page` and `pageSize=5`.
- **Disabled states:** Previous is disabled on page 1 and Next on the last page (from `total`). With one page of results both are disabled and the controls stay in place.
- **URL:** the page is in the URL (`?page=2`), so reload and shared links open the same page, also with filters (`?search=pay_205&currency=USD&page=2`). Page 1 has no `page` param. Each page move is one Back step, and Back and Forward step through pages.
- **Resets:** a new search, a new currency, pressing Search again with the same filters, and Clear Filters all return to page 1. Being on page 2 alone doesn't show Clear Filters.
- **Bad pages:** `?page=0`, `-1`, `abc` or `1.5` opens page 1. A page past the end (`?page=99`) redirects to page 1 with the filters kept; the dead URL is replaced, so Back doesn't return to it.
- **Keyboard:** Tab reaches both buttons, Enter or Space presses them, and the focus outline is visible. When a press disables the pressed button (Next onto the last page, Previous onto page 1), focus moves to the other button.
- **Screen readers:** the controls are a navigation landmark named "Pagination". "Page N" is announced politely when the new page's rows arrive. Disabled buttons are announced as unavailable.

## Design

The URL hook, `usePaymentFilters`, now also reads and writes `?page=` and returns `[state, setFilters, setPage]`. `setFilters` drops `page` whenever it changes the URL. `setPage(n)` pushes one entry (none for the same page), and `setPage(n, { replace: true })` replaces it. Only the reader checks the URL: a `?page=` that isn't a positive whole number reads as 1. `setPage` doesn't re-check its input.

`PaymentsPage` sends the current page in the request instead of a fixed `page=1`, works out total pages as `ceil(total / pageSize)`, and renders `Pagination` in the card's footer, after the table and only when there is a response. An effect redirects with `setPage(1, { replace: true })` when a real response (not placeholder data) shows the page is above 1 and past the last page.

`Pagination` is a new component: `<nav aria-label="Pagination">` with Previous, the "Page N" label (a polite, atomic live region) and Next. It takes the page of the response on screen (not the URL's, so the label follows the rows), total pages and `onPageChange`, owns the disabled states, and moves focus in a layout effect once the page changes and the pressed button is disabled.

![Step 8 system design. Same as Step 7, plus pagination. The browser URL now also holds ?page=, and usePaymentFilters returns the filters, setFilters and a separate setPage; setFilters drops the page. PaymentsPage sends page and pageSize in the request to GET /api/payments, computes total pages from the response, and renders the new Pagination component in the table card's footer, inside a navigation landmark named Pagination. Pagination calls onPageChange, which is setPage. When a response shows the page is past the end, PaymentsPage calls setPage(1) with replace, which removes page from the URL with replaceState. In tests, Pagination.test renders the component alone, and usePaymentFilters.test and PaymentsPage.test also check paging.](step-8-system-design.svg)

CI now runs the graded Step 1–8 tests (`-t "…|Step 7:|Step 8:"`) as well as lint, `tsc -b`, our tests and the build.

- **`src/components/Pagination.tsx`:** the new component.
- **`src/components/PaymentsPage.tsx`:** the current page in the request, the footer, and the redirect.
- **`src/hooks/usePaymentFilters.ts`:** `?page=`, `setPage`, and the reset in `setFilters`.
- **`src/constants/i18n.ts`:** the new `PAGINATION_LABEL` key.
- **`.github/workflows/ci.yml`:** adds `Step 8:` to the graded filter.

The reasoning behind each choice is in [Step 8 decisions](../decisions/ADR-step8.md).

## Testing

- **URL hook** (`usePaymentFilters.test.ts`): `?page=` parsing (`it.each` over `0`, `-1`, `abc`, `1.5` and absent), page 1 removing the param, one history entry per move and none for the same page, and search, currency and clear each removing `page`.
- **`Pagination` alone** (`Pagination.test.tsx`): the "Page N" text, Previous disabled on page 1, Next disabled on the last page, both disabled with one page, the values passed to `onPageChange`, focus moving to the other button, the "Pagination" landmark and the polite live label.
- **Page seam** (`PaymentsPage.test.tsx`, mock server): Next sends `page=2` and `pageSize=5` and shows page 2's payments; Previous returns; filters stay in the request while paging; loading from `?page=3` and from a combined URL; Back and Forward; search, currency and Clear Filters reset to page 1; page 2 alone shows no Clear Filters; bad pages read as 1; `?page=99` redirects to page 1 with the history length unchanged, also with a filter; no controls with an error message or the skeleton.
- **Style:** queries by role and name only, test names start with "should", and `it.each` for cases of the same shape.
- **The graded test is weak:** it only checks that both buttons exist and that Previous is disabled on page 1. It passes with pagination that never pages, so the tests above are the real check.
- `src/App.test.tsx` is unchanged.

## Acceptance criteria

- [ ] Previous, "Page N" and Next show below the table; Previous is disabled on page 1 and Next on the last page.
- [ ] Next and Previous show different payments, and the request carries `page` and `pageSize=5`.
- [ ] The page is in the URL, with no param for page 1, and Back and Forward step through pages.
- [ ] Search, currency and Clear Filters return to page 1.
- [ ] A bad page reads as 1, and a page past the end redirects to page 1.
- [ ] The controls are a named landmark, the page is announced, and focus isn't lost when a button disables.
- [ ] `npm run test:step1` to `test:step8`, our tests, `tsc -b`, lint and the build pass, and CI runs the graded Step 1–8 tests. These are checked at the end of the step.

## Known limits

- **Browser and screen-reader checks are pending:** focus on a button that becomes disabled in Chrome, Firefox and Safari, whether VoiceOver reads both "Loading payments…" and "Page N", what it reads for the arrows, and the footer at 320px wide.
- **Arrows in the names:** a screen reader may read them aloud. The graded tests need them in the names, together with native `disabled`.
