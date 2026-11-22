# Spec: Step 3, Clear Filters

## Goal

From the README:

> **Goal**: Add ability to clear all active filters
> - Show a "Clear Filters" button when any filter is active
> - Reset the search input to empty
> - Hide the clear button when no filters are active

Graded test: `App - Step 3: Clear Filters` (`npm run test:step3`).

## Scope

- **In:** the Clear Filters button, when it shows, what clearing does to the input, the URL and the table, Back/Forward, focus and the keyboard, its styling, hiding the browser's own × in the search box, and WCAG 2.2 AA for all of these.
- **Out:**
  - The currency filter and clearing it (Step 6).
  - The 404 and 500 messages (Steps 4–5).
  - Pagination (Step 8), including resetting the page on clear.
  - A "filters cleared" announcement: there's no i18n string for it, and the existing loading status already announces the refetch.

## User-facing behaviour

- **When it shows:**
  - "Clear Filters" appears to the right of Search while a search is applied, as in the screenshot. That's after a search, or when the page opens with `?search=` in the URL.
  - It doesn't show when nothing is applied, or while text is typed but not searched.
- **Clicking it:**
  - The search box empties, discarding any unsearched edits.
  - `?search` leaves the URL, while the path (the GitHub Pages base) and any other query params stay.
  - The table goes back to the first 5 payments, keeping the previous rows dimmed and busy until they arrive.
  - The button disappears.
  - Focus moves to the search box.
- **History:**
  - Clearing adds a browser history entry. Back restores the search in the input, the table and the button. Forward clears it again.
- **Keyboard:**
  - Tab from Search reaches Clear Filters, and Enter or Space clears.
  - Enter in the search box still runs a search, not a clear.
- **Look:**
  - A grey button (`#6b7280`, `#4b5563` on hover) with white text, the same height and focus outline as Search.
  - From 640px up, it sits in the row with the box and Search. Below 640px the three stack, and nothing scrolls sideways at 320px.
  - The search box no longer shows the browser's own × (Chrome, Edge, Safari), so Clear Filters is the one clear action.
- **Accessibility:**
  - It's a native `<button type="button">` named "Clear Filters", inside the search landmark.
  - The text is 4.83:1, and the focus outline against the page is 9.14:1. It's 36px tall.

## Design

`PaymentsPage` works out whether any filter is applied from `usePaymentFilters`. While one is, it passes `onClear` to `SearchForm`, which then renders the button. Clicking calls `onClear`, which is `setFilters({ search: '' })`: the hook pushes the new URL and notifies its subscribers, so the page re-reads the filters, the draft follows the empty term, and the query goes back to the unfiltered list. `SearchForm` then focuses the input through a ref.

![Step 3 system design. In the browser, PaymentsPage reads the applied filters from usePaymentFilters, which reads and writes the URL's ?search= with useSyncExternalStore, history.pushState and popstate. PaymentsPage renders SearchForm, passing onSearch, and onClear only while a filter is applied. SearchForm holds the typed draft, calls onSearch on submit, and on Clear Filters calls onClear, which calls setFilters with an empty search, then focuses the input. PaymentsPage also uses lib/format and the ui components, and calls usePayments, a useQuery hook with keepPreviousData, then fetchPayments, which sends GET /api/payments, answered by the MSW service worker. In tests, the setup file loads jest-dom matchers and resets the URL after every test; PaymentsPage.test drives the page with user-event against the MSW Node server, usePaymentFilters.test tests the hook with renderHook, and format.test unit-tests lib/format.](step-3-system-design.svg)

CI now runs the graded Step 1–3 tests (`-t "Step 1:|Step 2:|Step 3:"`) as well as lint, `tsc -b`, our tests and the build. Pushes to `main` that pass deploy to GitHub Pages, as before.

- **`src/components/SearchForm.tsx`:**
  - A new optional prop, `onClear?: () => void`.
  - A ref on the input, and `[&::-webkit-search-cancel-button]:appearance-none` to hide the browser's own ×.
  - A `<Button type="button">` with `I18N.CLEAR_FILTERS`, after Search, rendered only when `onClear` is passed. Its handler calls `onClear()` and then focuses the input.
- **`src/components/PaymentsPage.tsx`:** `hasAppliedFilters` (Step 3: `filters.search !== ''`) decides both whether `search` is sent and whether `onClear` is passed.
- **`src/hooks/usePaymentFilters.ts`:** unchanged.
- **Test setup:** `src/test/setup.ts` also loads `@testing-library/jest-dom/vitest`.

The reasoning behind each choice is in [Step 3 decisions](../decisions/ADR-step3.md).

## Testing

- **Page seam:** `src/components/PaymentsPage.test.tsx` adds 13 Clear Filters tests to Steps 1–2's 36. They use user-event and role/name queries only.
  - The button is absent with no filter and while text is only typed. It's present after a search, inside the search landmark, and on a page load with `?search=`.
  - Clicking it:
    - empties the box, including unsearched edits;
    - shows the first 5 payments;
    - removes `?search` while keeping `/base/` and `?view=compact`;
    - hides the button.
  - Back restores the search, the input and the button. Forward clears again.
  - Focus lands on the search box after the button unmounts and the list reloads.
  - Enter in the box still searches while the button shows. Tab to the button, then Enter or Space, clears (`it.each`).
- **Hook seam:** `src/hooks/usePaymentFilters.test.ts` adds one test: clearing adds exactly one history entry.
- **Matchers:** presence and absence use jest-dom's `toBeInTheDocument()` across the whole page test file.
- `src/App.test.tsx` is unchanged.

## Acceptance criteria

- [x] "Clear Filters" shows while a search is applied, and only then.
- [x] Clicking it empties the search box, removes the search from the URL (keeping the path and other params), shows the first 5 payments and hides the button.
- [x] Back after clearing restores the search, and Forward clears again.
- [x] Focus moves to the search box after clearing. The button works with Tab plus Enter or Space, and Enter in the box still searches.
- [x] It matches the screenshot's grey, and every colour passes WCAG 2.2 AA. It's at least 24×24px, and nothing scrolls sideways at 320px.
- [x] `npm run test:step1`, `test:step2` and `test:step3` pass, our 77 tests pass, and `tsc -b`, lint and the build pass.
- [x] CI runs the graded Step 1–3 tests.

## Known limits

- Windows forced-colours (High Contrast) rendering of the button isn't checked.
- Clearing isn't announced as such. Screen-reader users hear the empty search box take focus, and "Loading payments…" while the list reloads.
- Hiding the browser's own × was checked in Chrome only, not Safari.
- Back/Forward is tested in jsdom. The real-browser check (Playwright driving Chrome) was a manual run, not part of the test suite.
