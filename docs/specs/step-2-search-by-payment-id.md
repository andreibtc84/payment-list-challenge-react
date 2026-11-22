# Spec: Step 2, Search by Payment ID

## Goal

From the README:

> **Goal**: Add search functionality for payment IDs
> - Add a search input with proper ARIA labels
> - Add a search button
> - Implement search functionality that queries the API
> - Use the i18n strings for labels and placeholders (see `src/constants/i18n.ts`)

Graded test: `App - Step 2: Search by Payment ID` (`npm run test:step2`).

## Scope

- **In:** the search form, running a search against the API, the search held in the URL (reload, shared links, Back/Forward), the loading state during a search, and WCAG 2.2 AA for all of these.
- **Out:** Clear Filters (Step 3), including hiding the browser's native × clear button. The 404 and 500 messages (Steps 4–5), so a search with no match currently shows no message. The currency filter (Step 6) and pagination (Step 8). Also a visible label, a hint explaining why Search is unavailable, react-hook-form and a router.

## User-facing behaviour

- **Form:** above the table, a search box with the placeholder "Enter payment ID" and a "Search" button, as in the screenshot. From 640px (`sm`) up, the input is half the content width with the button 16px to its right. Below 640px they stack, with the input full width and the button under it, and nothing scrolls sideways at 320px.
- **Running a search:**
  - Clicking Search or pressing Enter trims the text and puts it in the URL as `?search=…`, adding a browser history entry.
  - The page requests `GET /api/payments?page=1&pageSize=5&search=…` and shows the matching payments.
  - The term stays in the input, and focus stays where it was.
- **Empty input:** while the box is empty or only spaces, Search is unavailable. It has `aria-disabled="true"` and a not-allowed cursor, keeps its full blue as in the screenshot, and stays in the Tab order. Clicking it or pressing Enter does nothing: no request and no history entry. If a search is applied and the operator clears the box and submits, the applied search stays.
- **URL:**
  - Reloading, opening a shared link, or Back/Forward shows that URL's search, in both the input and the table.
  - Back after a search returns to the previous search or to all payments, and Forward redoes it.
  - Searching the term that's already applied adds no history entry.
  - A hand-edited `?search=%20pay_1%20` is treated as `pay_1`.
  - The path (the GitHub Pages base) and any other query params are kept.
  - With no search, the request is exactly Step 1's: no `search` param.
- **Loading during a search:** the current rows stay on screen, slightly dimmed (`opacity-90`) and marked `aria-busy="true"`, until the results arrive. The hidden status region says "Loading payments…". The skeleton shows only on the first load.
- **Accessibility:**
  - The form is a `search` landmark. The input is a search box named "Search payments" by a visually hidden label.
  - The Search button and the input have a 2px dark focus outline. Every text and border colour passes AA, and the dimmed rows keep every cell at 4.5:1 or better.

## Design

`PaymentsPage` reads the applied search from the URL through `usePaymentFilters`, renders `SearchForm`, and passes the search to `usePayments`. `SearchForm` reports a submit through `onSearch`, which calls `setFilters`. That writes the URL with `history.pushState` and notifies the hook's subscribers, and Back/Forward reach the hook through `popstate`.

![Step 2 system design. In the browser, PaymentsPage reads the applied search from usePaymentFilters, which reads and writes the URL's ?search= with useSyncExternalStore, history.pushState and popstate. PaymentsPage renders SearchForm, which holds the typed draft and calls onSearch on submit. PaymentsPage also uses lib/format and the ui components (Table, Badge, Skeleton, Button, Input), and calls usePayments, a useQuery hook with keepPreviousData, then fetchPayments, which sends GET /api/payments with the search param, answered by the MSW service worker from the mock handlers. In tests, PaymentsPage.test renders the page with user-event against the MSW Node server, usePaymentFilters.test tests the hook with renderHook, format.test unit-tests lib/format, and a setup file resets the URL after every test.](step-2-system-design.svg)

CI on GitHub Actions now runs the graded Step 1 and Step 2 tests (`-t "Step 1:|Step 2:"`) as well as lint, `tsc -b`, our tests and the build. Pushes to `main` that pass deploy to GitHub Pages, as in Step 1.

- **`src/hooks/usePaymentFilters.ts`:** `usePaymentFilters()` returns `[filters, setFilters]`.
  - `PaymentFilters` is `{ search: string }`.
  - It reads with `useSyncExternalStore` on `location.search`. Writes use `pushState` and then notify subscribers, unless the parsed filters are unchanged.
  - One `normaliseSearch` (trim, `''` when missing) serves both reading and writing.
- **`src/components/SearchForm.tsx`:** props `{ term, onSearch }`. It holds the draft and follows `term` by adjusting state during render. It's `<form role="search">` with a hidden label, `<Input type="search">` and `<Button type="submit">`.
- **`src/components/PaymentsPage.tsx`:**
  - It wires the hook and the form.
  - It adds `search` to the params only when it isn't empty.
  - The skeleton shows only while `isPending`. While `isPlaceholderData`, the table is dimmed and `aria-busy`.
- **`src/hooks/usePayments.ts`:** adds `placeholderData: keepPreviousData`.
- **`src/api/payments.ts`:** `PaymentQueryParams` becomes an interface extending `Pagination`, with an optional `search`.
- **`src/components/ui/`:** a shared `Button` (one default look, the focus outline, `aria-disabled:` styles) and an `Input` based on shadcn's v3 input, both in the starter's colours.
- **Test setup:** `src/test/setup.ts`, registered in `vitest.config.ts`, resets the URL after every test. New dev dependency: `@testing-library/user-event@14.6.13`.

The reasoning behind each choice is in [Step 2 decisions](../decisions/ADR-step2.md).

## Testing

- **Page seam:** `src/components/PaymentsPage.test.tsx` adds 20 search tests to Step 1's 16.
  - The tests drive the page with user-event, capture the request params from MSW, and query by role and name only.
  - Search runs by click and by Enter. Each sends `search=pay_134_1` with `page=1` and `pageSize=5` and shows only that payment.
  - The term stays, the URL holds `?search=pay_134_1`, and the term is trimmed.
  - Empty or blank input: Search is `aria-disabled`, still reachable with Tab, and sends no request and adds no history entry.
  - An empty submit doesn't clear an applied search.
  - A page load with `?search=` set, including `%20`, applies the search.
  - Back returns to all payments and Forward redoes the search, in both the input and the table.
  - Focus stays on the control used.
  - Searching the applied term again adds no history entry.
  - While a search loads, the rows stay, the table is busy, and loading is announced.
- **Hook seam:** `src/hooks/usePaymentFilters.test.ts`, 11 tests using `renderHook`:
  - read, trim and default;
  - set and push;
  - delete when empty;
  - no push when unchanged, including the `%20` case;
  - path and unknown params kept;
  - stable `filters` identity;
  - following Back.
- **URL reset:** after every test, so tests (including the graded ones) can't leak a search into each other.
- `src/App.test.tsx` is unchanged.

## Acceptance criteria

- [x] A search box named "Search payments" with the placeholder "Enter payment ID", and a "Search" button, inside a search landmark.
- [x] Click or Enter sends `search` with `page=1` and `pageSize=5`, and shows only the matching payments.
- [x] The term is trimmed and stays in the input. Focus stays where it was.
- [x] An empty search is unavailable (`aria-disabled`), sends nothing and adds no history entry.
- [x] The search is in the URL. Reload, shared links and Back/Forward show it in both the input and the table, and repeating a search adds no entry.
- [x] While a search loads, the previous rows stay, dimmed and busy, and loading is announced.
- [x] All new text comes from `I18N`, and all colours pass WCAG 2.2 AA.
- [x] `npm run test:step1` and `npm run test:step2` pass, our 63 tests pass, and `tsc -b`, lint and the build pass.
- [x] CI runs the graded Step 1 and Step 2 tests.

## Known limits

- A search with no match, or the mock's `pay_404` and `pay_500`, shows no message yet (Steps 4–5).
- Clearing the box doesn't clear the applied search. That's Clear Filters in Step 3.
- In Chromium, the browser's own × button may still show in the search box. It only empties the box.
- The dimming while loading is subtle, because stronger dimming fails text contrast.
- Forced-colours focus and the 320px layout are checked by reading the CSS, not by an automated test. jsdom has no layout.
- Back/Forward is tested in jsdom, not in a real browser.
