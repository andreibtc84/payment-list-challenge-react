# Spec: Step 7, Combined Currency and Payment ID Filter

## Goal

From the README:

> **Goal**: Ensure currency and payment ID filters work together
> - Allow filtering by both currency and payment ID simultaneously
> - Ensure the API receives both filter parameters
> - Display results that match both criteria

Graded test: `App - Step 7: Combined Currency and Payment ID Filter` (`npm run test:step7`).

## Scope

- **In:**
  - Proving that a Payment ID search and a currency filter work together, in either order, from the URL, and with Clear Filters.
  - What the page shows when nothing matches both filters.
  - CI running the graded Step 7 test.
  - The currency select's arrow and text spacing (raised during Step 7, see Design).
- **Out:**
  - **Step 8:** pagination. The combined result is checked on page 1 only.
  - "No payments found." for an empty combined result (see Known limits).
  - Changes to the mock API or its data.

## User-facing behaviour

- **Both filters together:** search a Payment ID and choose a currency, in either order, and the table shows only payments matching both, at most 5 rows. The request to `GET /api/payments` carries both `search` and `currency`.
- **URL:** both filters are in the URL (`?search=pay_134&currency=USD`), so reloading or sharing the link shows the same rows, with the search box and the dropdown filled in.
- **Changing one keeps the other:**
  - Choosing "Currencies" removes only the currency; the search stays.
  - A new search keeps the chosen currency.
  - Typing without pressing Search changes nothing (as in Step 6).
- **Clear Filters:** one click removes both, shows the first 5 payments and adds one Back step.
- **No match for both** (for example `pay_134` in ZAR): "Payment not found." replaces the table. The heading, both filter values and Clear Filters stay, so either filter can be changed.
- **Look:** the dropdown's text now starts at the same inset as the search box's, and its chevron sits 12px from the right edge in every browser.
- **Accessibility:** no new controls. Keyboard use, focus and screen-reader announcements are the same as Steps 4–6.

## Design

No filtering code changed. Since Step 6, `usePaymentFilters` merges each partial update (`{ search }` or `{ currency }`) into the filters already in the URL, and `PaymentsPage` sends every filter that's set. So the two filters already reach the API together, and the mock API applies them with AND. A 404 for "nothing matches both" goes through the existing `getErrorMessage` mapping.

The one code change is in `SearchForm`: the currency `<select>` turns off the native arrow (`appearance-none`, `pr-8`), and a decorative inline SVG chevron (`aria-hidden`, `currentColor`) sits in a wrapper at a fixed inset. It's still a native select.

![Step 7 system design. Same as Step 6: main.tsx starts MSW and renders App, which renders PaymentsPage. PaymentsPage reads the search and currency filters from usePaymentFilters, which holds both in the URL. SearchForm sets either filter through setFilters, which merges it with the other, and now draws its own chevron on the currency select. PaymentsPage calls usePayments and fetchPayments, which send ?search= and &currency= together to GET /api/payments. The mock handlers apply search AND currency and answer 404 when nothing matches both, which getErrorMessage shows as Payment not found. In tests, PaymentsPage.test now also checks the combined filters: exact Payment IDs, Currency cells, request params and the URL.](step-7-system-design.svg)

CI now runs the graded Step 1–7 tests (`-t "…|Step 6:|Step 7:"`) as well as lint, `tsc -b`, our tests and the build.

- **`src/components/PaymentsPage.test.tsx`:** a new "combined filters" block; the Clear Filters test with both filters now waits for the combined result.
- **`src/components/SearchForm.tsx`:** the select's own chevron.
- **`.github/workflows/ci.yml`:** adds `Step 7:` to the graded filter.

The reasoning behind each choice is in [Step 7 decisions](../decisions/ADR-step7.md).

## Testing

- **Page seam:** `src/components/PaymentsPage.test.tsx`, new "combined filters" block. Each test asserts the exact Payment IDs shown, every row's Currency cell, the last request's `search` and `currency` (a filter that isn't set must be absent), and the URL:
  - search then currency, and currency then search (`it.each`)
  - both filters loaded from the URL, with the controls showing them
  - more than 5 matches (`pay_205` in USD has 6) shows the first 5
  - "Currencies" keeps the search; a new search keeps the currency
  - no match for both shows "Payment not found." with both filters still shown
- **Clear Filters block:** the both-filters case waits for the combined result before clearing, and checks the exact first page afterwards.
- **Not re-tested for the combination:** typing without searching, screen-reader announcements and keyboard use. Step 6's tests cover them and Step 7 adds no new controls.
- **Proving the tests:** the behaviour already existed, so every new test passed on its first run. Each was proved by breaking the code on a throwaway copy and watching it fail (10 different breaks, such as a currency change dropping the search, or the request losing `currency`).
- **The graded test is weak:** it checks that some element reads "USD", which the dropdown's own option always does. Our tests assert on the table's rows instead.
- **Browser check of the chevron:** Playwright in Chrome and WebKit, forced colours and 320px, plus axe (no WCAG 2.2 A/AA violations). These were one-off runs, not part of the test suite.
- `src/App.test.tsx` is unchanged.

## Acceptance criteria

- [x] Searching a Payment ID and choosing a currency, in either order, shows only payments matching both, and the request carries both params.
- [x] Both filters are in the URL and restored on load.
- [x] Changing one filter keeps the other; Clear Filters removes both.
- [x] No match for both shows "Payment not found." in place of the table.
- [x] The select's text and chevron line up the same in Chrome and WebKit; axe reports no violations.
- [x] `npm run test:step1` to `test:step7` pass, our 146 tests pass, and `tsc -b`, lint and the build pass.
- [x] CI runs the graded Step 1–7 tests.

## Known limits

- **Message wording:** with a currency chosen, "Payment not found." is less precise than "No payments found.", but the client can't tell this 404 from `pay_404` without extra logic. If a real API returned 200 with an empty list, "No payments found." would fit.
- **Browsers:** the chevron was checked in Chrome and Playwright's WebKit, not in real Safari or Firefox.
