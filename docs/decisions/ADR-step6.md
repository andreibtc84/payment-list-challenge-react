# Step 6 decisions: Currency Filter

The architecture and code decisions behind Step 6.

| # | Decision |
|---|---|
| 1 | [The dropdown lists every code in `CURRENCIES`](#1-the-dropdown-lists-every-code-in-currencies) |
| 2 | [A currency choice applies immediately, on change](#2-a-currency-choice-applies-immediately-on-change) |
| 3 | [The currency lives in the URL; unlisted values mean "no filter"](#3-the-currency-lives-in-the-url-unlisted-values-mean-no-filter) |
| 4 | [A `Currency` type for the filter, not for the response](#4-a-currency-type-for-the-filter-not-for-the-response) |
| 5 | [A hidden label, as in the screenshot](#5-a-hidden-label-as-in-the-screenshot) |
| 6 | [The select shares the search input's field styles](#6-the-select-shares-the-search-inputs-field-styles) |
| 7 | [Search and currency combine, but Step 7 isn't claimed](#7-search-and-currency-combine-but-step-7-isnt-claimed) |

---

## 1. The dropdown lists every code in `CURRENCIES`

**Context.** The README lists six currencies (USD, EUR, GBP, AUD, CAD, ZAR) and points to `src/constants/index.ts`. That constant has eight: the six plus JPY and CZK. The mock data uses all eight (USD 22, EUR 16, GBP 15, AUD 10, JPY 6, ZAR 4, CAD 3, CZK 1).

**Decision.** The first option is "Currencies" (no filter), followed by every entry of `CURRENCIES` in its order.

**Alternatives.**
- Only the README's six. This is the strictest reading, but the JPY and CZK payments couldn't be filtered to, and it needs a second list.
- Edit the constant down to six. This changes a provided file and leaves the same gap.

**Consequences.**
- One source of truth, and every payment in the data can be reached.
- It treats the README's "Include all currencies: …" as a minimum, not an exact list. That's an interpretation.

## 2. A currency choice applies immediately, on change

**Context.** The search box is a draft until Search is pressed. The graded test changes the select and never clicks Search, so it expects filtering on change. WCAG 3.2.2 (On Input) forbids a *change of context* on input.

**Decision.**
- Changing the select writes the currency filter at once and the list refetches.
- Search still applies only the typed Payment ID; the select has no draft.
- Choosing "Currencies" removes the filter.

**Alternatives.**
- Make the select a draft applied on Search, for consistency with the input. The graded filter test would then pass only because the unfiltered first page already contains a USD row (`pay_134_1`), so it wouldn't prove anything.

**Consequences.**
- One action, with immediate feedback.
- WCAG's definition of "change of context" (user agent, viewport, focus, or content that changes the meaning of the page) doesn't cover re-filtering a table while focus stays on the select. W3C's own technique SCR19 ("onchange on a select element without causing a change of context") lists this pattern as sufficient.
- In a real browser (Chrome, macOS), type-ahead applies a currency at once and focus stays on the select. Arrow keys open the picker. On Windows, arrows on a closed select change the value directly, so each press would filter; that's untested.
- The tests check that **every** row shows the chosen currency and that the request sends `currency=`, because the graded check alone would pass without any filtering.

## 3. The currency lives in the URL; unlisted values mean "no filter"

**Context.** Since Step 2, the URL is the source of truth for applied filters, read and written only by `usePaymentFilters`. Each search adds a Back step, and re-applying the same filters adds none.

**Decision.**
- `?currency=EUR` holds the filter. Each change pushes one history entry, and the select follows Back/Forward because its value comes from the URL.
- The "nothing changed" check compares **every** filter. Comparing and writing both walk one key list, so Step 8's page number is added in one place.
- Only exact listed codes count. `?currency=XYZ` or `?currency=usd` reads as no filter: the select shows "Currencies", nothing is sent, and Clear Filters stays hidden. The next filter change rewrites the URL without it.
- The page sends each filter only when it's set, and Clear Filters resets both in one call (one Back step).

**Alternatives.**
- Pass an unknown value through and let the API decide. The select couldn't show it, so the page would be filtered by something invisible (the mock answers 404).
- `replaceState` for currency changes. That would mean no Back step, which is inconsistent with search.

**Consequences.**
- The select, the URL and the request can't disagree.
- Browsing currencies leaves one history entry per choice.
- A hand-typed lowercase code is ignored rather than corrected.

## 4. A `Currency` type for the filter, not for the response

**Context.** Since Step 1, `Payment.currency` has been a plain string, with a narrower type deferred to the currency filter.

**Decision.**
- `CURRENCIES` is `as const`, and `Currency` is the union of its entries. `CurrencyFilter = Currency | ''` names the filter's value, with `''` meaning no filter.
- One `isCurrency` guard, next to the list, validates both boundaries: the URL in the hook, and the select's `change` value in the form, instead of an `as` cast.
- `Payment.currency` in the API response stays `string`.

**Alternatives.**
- `Currency` everywhere. That would claim the server only sends known codes without validating responses.
- `string` everywhere. Simplest, but a mistyped code compiles.

**Consequences.**
- A typo in filter code fails to compile.
- Responses aren't validated, so the table shows whatever code arrives.

## 5. A hidden label, as in the screenshot

**Context.** The screenshot shows no label next to the select. The graded test finds it by role and name, "Filter by currency". The search box already uses a hidden `<label>`.

**Decision.** A visually hidden `<label>` names the select. The visible "Currencies" option is the cue for sighted users.

**Alternatives.**
- A visible "Filter by currency" label. This clearly meets WCAG 3.3.2 (labels "persistently available") and 2.5.3 (the visible label is the name), but it departs from the screenshot.
- `aria-label`. It's inconsistent with the search box.

**Consequences.**
- It matches the design and the search box.
- This is an accepted risk. 3.3.2 relies on the purpose being clear from context, which W3C's forms tutorial allows, and once a currency is chosen the only visible cue is the code. If an auditor treats "Currencies" as a visible label, 2.5.3 could fail for speech users, because the name (fixed by the graded test) doesn't contain it. Real screen-reader and voice-control checks haven't been done. The fallback is to make the label visible; the name doesn't change.

## 6. The select shares the search input's field styles

**Context.** The select should look like the search input: the same border (4.6:1 against the page), height, radius and focus ring.

**Decision.** The shared field classes live in one `fieldClassName`, exported from `components/ui/input.tsx` next to `Input` (the way shadcn exports `buttonVariants` from its button file). The `Input` adds its own extras (placeholder and disabled styles), and the select adds only its width (about the screenshot's from `sm` up, full width on phones). It's a native `<select>`, not a custom listbox.

**Alternatives.**
- Copy the class string onto the select. This was the first version; the code review flagged it as duplication.
- A separate `ui/field.ts` for the constant. Neutral, but a file for one string.
- A shadcn/Radix `Select`. It's a custom listbox with more code and more accessibility surface than a native select.

**Consequences.**
- One place to change field styling.
- Checked in Chrome: axe found no violations, the select is 128×36, the focus outline is 9.1:1 and still shows in forced colours, and nothing scrolls sideways at 320px.

## 7. Search and currency combine, but Step 7 isn't claimed

**Context.** Because the hook merges partial filters and the page sends every set filter, a search and a currency already reach the API together after Step 6. Combining them is Step 7.

**Decision.** Step 6 adds no combined-filter tests, doesn't add Step 7 to CI, and makes no README claim. Step 7 will verify and document it.

**Alternatives.**
- Block the combination until Step 7. That's extra code purely to remove behaviour the next step needs.

**Consequences.**
- Untested behaviour ships for one step.
- When no payment matches both filters, the mock answers 404 and the page shows "Payment not found.". Whether that wording fits is a Step 7 question.
