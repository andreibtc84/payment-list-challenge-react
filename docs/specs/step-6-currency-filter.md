# Spec: Step 6, Currency Filter

## Goal

From the README:

> **Goal**: Add currency filtering functionality
> - Add a currency dropdown with all available currencies
> - Filter payments by selected currency
> - Use proper ARIA labels for accessibility
> - Include all currencies: USD, EUR, GBP, AUD, CAD, ZAR (see `src/constants/index.ts`)
> - Clear all filters clicked should clear the currency filter

Graded test: `App - Step 6: Currency Filter` (`npm run test:step6`).

## Scope

- **In:**
  - A currency dropdown in the search form, as in `docs/filter_by_currency.png`.
  - Filtering the list by the chosen currency, kept in the URL.
  - Clear Filters covering the currency.
  - Back/Forward and accessibility.
- **Out:**
  - **Step 7:** claiming or testing combined search + currency. It works already, but Step 7 checks it.
  - **Step 8:** pagination.
  - **Not provided:**
    - Currency names or flags (no i18n strings).
    - Choosing several currencies at once.
    - Announcing the number of results (no i18n string).
  - **Left as is:**
    - Fixing an invalid `?currency=` in the address bar on load.
    - Validating API responses.

## User-facing behaviour

- **The control:** a dropdown between the search box and Search, named "Filter by currency" for assistive tech. It lists "Currencies" (no filter), then USD, EUR, GBP, AUD, CAD, ZAR, JPY, CZK: every code in `CURRENCIES`, since the data uses all eight.
- **Choosing a currency:**
  - It filters straight away, with no need to press Search. Every row then shows that currency.
  - The previous rows stay dimmed while the new ones load, and focus stays on the dropdown.
  - "Currencies" removes the filter.
- **The two controls are independent:**
  - Typing in the search box doesn't change the currency.
  - Choosing a currency doesn't apply text that hasn't been searched yet.
- **URL and history:**
  - The choice is in the URL (`?currency=EUR`), so reloading or sharing a link keeps it.
  - Each change is one Back step, and the dropdown follows Back/Forward.
  - Choosing the currency that's already applied adds no step.
  - An unlisted value such as `?currency=XYZ` or `usd` is treated as no filter.
- **Clear Filters:**
  - It shows while a search or a currency is applied, including on a page loaded with `?currency=EUR`.
  - It resets the dropdown and the search box in one Back step, keeps other URL params, and moves focus to the search box.
- **Errors:** an error message still replaces the table while a currency is chosen, exactly as in Steps 4–5.
- **Look and accessibility:**
  - The dropdown matches the search box's border, height and focus ring, and stacks full width on phones.
  - It's a native `<select>`, so it works with the keyboard and screen readers.

## Design

`usePaymentFilters` now owns two filters: `search` and `currency`. It reads `?currency=` and keeps it only if `isCurrency` (exact match against `CURRENCIES`) says it's listed. It writes both params from one key list and compares both when deciding whether anything changed. `PaymentsPage` passes the currency to `SearchForm` and sends each filter to the API only when it's set. Clear Filters clears both in one call. `SearchForm` renders the controlled `<select>`, whose value comes from the URL and whose changes go straight to `setFilters`.

![Step 6 system design. In the browser, main.tsx starts the MSW worker and renders App, which provides the TanStack Query client. App renders PaymentsPage. PaymentsPage reads the search and currency filters from usePaymentFilters, which reads and writes the URL's ?search= and ?currency=, keeps a currency only if it is listed, and follows Back and Forward. PaymentsPage renders SearchForm, which holds the search draft and a native currency select named Filter by currency; choosing a currency calls setFilters at once, and Clear Filters clears both filters. PaymentsPage uses lib/format and the ui components, where the search Input and the currency select share one set of field classes, and calls usePayments, which calls fetchPayments to send GET /api/payments with search and currency only when they are set. Errors go through getErrorMessage to the status region, in place of the table. The MSW service worker answers from the mock handlers, which filter by currency. In tests, PaymentsPage.test now also checks the currency select, that every row shows the chosen currency, the URL, history and Clear Filters, and usePaymentFilters.test checks currency parsing and writing.](step-6-system-design.svg)

CI now runs the graded Step 1–6 tests (`-t "…|Step 5:|Step 6:"`) as well as lint, `tsc -b`, our tests and the build.

- **`src/constants/index.ts`:** `CURRENCIES` is `as const`, with `Currency`, `CurrencyFilter` (`Currency | ''`) and the `isCurrency` guard next to it.
- **`src/hooks/usePaymentFilters.ts`:** adds `currency`. It parses with `isCurrency`, uses one `FILTER_KEYS` list for comparing and writing, and still pushes one history entry per change.
- **`src/components/SearchForm.tsx`:** adds the hidden label and the `<select>`, plus `currency` and `onCurrencyChange` props.
- **`src/components/PaymentsPage.tsx`:**
  - Each filter is sent only when set.
  - Clear Filters shows for either filter and clears both.
- **`src/api/payments.ts`:** `PaymentQueryParams` gains `currency?: Currency`. `Payment.currency` in the response stays a string.
- **`src/components/ui/input.tsx`:** exports `fieldClassName`, the classes the search `Input` and the select share.

The reasoning behind each choice is in [Step 6 decisions](../decisions/ADR-step6.md).

## Testing

- **Page seam:** `src/components/PaymentsPage.test.tsx`, with a new "currency filter" block:
  - the named combobox inside the search landmark, and the option order
  - the selected option from the URL
  - every row shows the chosen currency, and the request carries `currency=` but no `search`
  - URL and focus after a choice, a page loaded with `?currency=EUR`, and "Currencies" removing the filter
  - unlisted URL values ignored
  - Back/Forward, and no history step when re-choosing
  - the two controls staying independent
  - an error message while a currency is chosen
- **Clear Filters block:** shown for a currency alone (chosen or from the URL); resets both filters in one history entry, keeping other params; focus moves to the search box. The existing Tab test now expects input → select → Search.
- **Hook seam:** `src/hooks/usePaymentFilters.test.ts` covers:
  - parsing `?currency=`, including unlisted and lowercase values
  - writing and removing it while keeping the search
  - one entry per change, and no entry when nothing changed
  - clearing both filters together
- **Proving the tests:**
  - Several tests passed as soon as they were written, because earlier wiring already covered them. Each of those was proven by breaking the code on a throwaway copy and watching it fail.
  - The graded filter test can pass without filtering, because the unfiltered first page already has a USD row. Our every-row test is the real check.
- `src/App.test.tsx` is unchanged.

## Acceptance criteria

- [x] A dropdown named "Filter by currency" lists "Currencies" and every code in `CURRENCIES`, as in the screenshot.
- [x] Choosing a currency shows only payments in that currency, and the choice is in the URL.
- [x] Clear Filters shows for a currency and clears it together with the search.
- [x] Keyboard, focus and Back/Forward work. axe reports no WCAG 2.2 A/AA violations, and nothing scrolls sideways at 320px (checked in headless Chrome).
- [x] `npm run test:step1` to `test:step6` pass, our 139 tests pass, and `tsc -b`, lint and the build pass.
- [x] CI runs the graded Step 1–6 tests.

## Known limits

- **Hidden label:** the label is hidden, as in the screenshot. WCAG 3.3.2 relies on the purpose being clear from context. Real screen-reader and voice-control checks haven't been done.
- **Arrow keys:** on Windows, arrows on a closed select change the value directly, so each press filters and adds a Back step. Only macOS Chrome was checked.
- **Combined filters:** search + currency already combine, which is Step 7's to check. No matches shows "Payment not found.". (Checked and kept in [Step 7](step-7-combined-filter.md).)
- **Browser checks:** the browser and 320px checks were one-off headless Chrome runs, not part of the test suite.
