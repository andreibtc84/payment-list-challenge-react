# Step 7 decisions: Combined Currency and Payment ID Filter

The architecture and code decisions behind Step 7.

| # | Decision |
|---|---|
| 1 | [No new filtering code: Step 7 proves what Step 6 already does](#1-no-new-filtering-code-step-7-proves-what-step-6-already-does) |
| 2 | [No match for both filters shows "Payment not found."](#2-no-match-for-both-filters-shows-payment-not-found) |
| 3 | [Page-level tests, each proved able to fail](#3-page-level-tests-each-proved-able-to-fail) |
| 4 | [The currency select draws its own chevron](#4-the-currency-select-draws-its-own-chevron) |

---

## 1. No new filtering code: Step 7 proves what Step 6 already does

**Context.** Since Step 6, `usePaymentFilters` merges each partial update into the filters already in the URL, and `PaymentsPage` sends every filter that's set. So a search and a currency already reach the API together. Step 6 left this untested and unclaimed on purpose.

**Decision.** Step 7 changes no filtering code. It adds tests that prove the combination, adds Step 7 to CI, and documents it.

**Alternatives.**
- Refactor the filter code for Step 7 (for example a dedicated "combined filters" type). Nothing needs it: the one filter object already holds both.

**Consequences.**
- For filtering, the diff is tests, CI and docs, so it's easy to review. The only UI change is the select's arrow (decision 4).
- The proof rests on the tests, so they have to be able to fail (decision 3).

## 2. No match for both filters shows "Payment not found."

**Context.** When nothing matches both filters (for example `pay_134` in ZAR), the mock API answers 404, the same as for `pay_404`. `I18N.NO_PAYMENTS_FOUND` ("No payments found.") exists but isn't used.

**Decision.** Keep the existing mapping: a 404 shows "Payment not found." in place of the table. The heading, both filter values and Clear Filters stay, so the user can adjust either filter or reset.

**Alternatives.**
- Show "No payments found." for an empty combined result. It reads better for a mix of filters, but the client can't tell this 404 from `pay_404` without inspecting which filters were applied: extra logic for wording only.

**Consequences.**
- No new code, and every 404 is handled the same way.
- The wording is slightly less precise when a currency is chosen.
- If the real API answered an empty result with 200 and an empty list, "No payments found." would be the natural message. The README only documents the mock.

## 3. Page-level tests, each proved able to fail

**Context.** The graded Step 7 test passes before any Step 7 work. It checks that some element reads "USD", and the currency select's own "USD" option always does, so it would pass even if both filters were ignored.

**Decision.**
- New tests at the page seam (`PaymentsPage` with the mock server), asserting the exact Payment IDs in the table, every row's Currency cell, the request params (a filter that isn't set must be absent) and the URL:
  - search then currency, and currency then search
  - both filters loaded from the URL
  - more than 5 matches still shows 5 rows
  - changing one filter keeps the other
  - no match for both
- The existing Clear Filters test with both filters now waits for the combined result before clearing, and checks the exact first page afterwards.
- No new hook tests: merging is already tested at the hook.
- The behaviour already existed, so every new test passed on its first run. Each one was proved by breaking the code on a throwaway copy and watching it fail: a currency change dropping the search, a search dropping the currency, the request losing either param, the URL being ignored on load, a wrong page size, the 404 losing its message, and Clear Filters keeping the currency.

**Alternatives.**
- Rely on the graded test. It can't fail for this feature.
- Strict red → green. Not possible when the code already exists; deliberately breaking the code gives the same evidence.

**Consequences.**
- A future change that breaks the combination fails a named test.
- Proving each test takes extra time.

## 4. The currency select draws its own chevron

**Context.** Each browser draws a native select's arrow and inner padding its own way, so the currency text sat further in than the search box's text and the arrow's spacing differed between Chrome and Safari.

**Decision.**
- The select turns the native arrow off (`appearance-none`) and keeps the shared field styles, so its text starts 12px in, like the search box.
- A decorative inline SVG chevron (`aria-hidden`, ignores clicks) sits 12px from the right edge, vertically centred; `pr-8` keeps the text clear of it.
- It's still a native `<select>`: the popup, keyboard and screen-reader behaviour don't change.

**Alternatives.**
- Adjust padding only. Each engine adds its own, so no single value lines up everywhere.
- A CSS background-image arrow. Its colour is baked into the image, so it doesn't follow the forced text colour in forced-colours mode; the inline SVG uses `currentColor` and does.
- A custom listbox (shadcn/Radix Select). More code and more accessibility surface.

**Consequences.**
- The same look in every engine. Checked with Playwright in Chrome and WebKit (same text and chevron insets), in forced colours (chevron still drawn), at 320px (no sideways scroll), and with axe (no WCAG 2.2 A/AA violations).
- One extra wrapper element and icon in `SearchForm`. Real Safari and Firefox weren't checked.
