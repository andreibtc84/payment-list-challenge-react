# Step 8 decisions: Pagination

The architecture and code decisions behind Step 8.

| # | Decision |
|---|---|
| 1 | [The page lives in the URL, with its own `setPage`, and filters reset it](#1-the-page-lives-in-the-url-with-its-own-setpage-and-filters-reset-it) |
| 2 | [Next is disabled from `total`](#2-next-is-disabled-from-total) |
| 3 | [The controls are a card footer, not a `<tfoot>`](#3-the-controls-are-a-card-footer-not-a-tfoot) |
| 4 | [A bad page reads as 1; a page past the end redirects to page 1](#4-a-bad-page-reads-as-1-a-page-past-the-end-redirects-to-page-1) |
| 5 | [Accessibility: a named `<nav>`, a live page label, and focus that moves](#5-accessibility-a-named-nav-a-live-page-label-and-focus-that-moves) |
| 6 | [Tests at three seams](#6-tests-at-three-seams) |

---

## 1. The page lives in the URL, with its own `setPage`, and filters reset it

**Context.** Search and currency already live in the URL through `usePaymentFilters`, so Back, reload and shared links work for them. The table now needs a current page too.

**Decision.**
- The hook also reads and writes `?page=` (no param for page 1) and returns `[state, setFilters, setPage]`. `FILTER_KEYS` stays filters only. `setPage` pushes one history entry, and none for the same page.
- Any change to the search or currency, pressing Search again with the same filters, and Clear Filters all drop `page`. Page 2 alone doesn't show Clear Filters, because a page isn't a filter.
- The hook keeps its name, so the docs of earlier steps stay true.

**Alternatives.**
- Local `useState`. The page would be lost on reload and Back would skip it.
- One setter with `page` in the key list. The list would stop meaning "filters".

**Consequences.**
- Back, Forward, reload and links keep the page, and each page is cached separately.
- Resetting follows the platform: a native GET search form rebuilds its query from its fields only, dropping a non-field value like `page` ([WHATWG form submission](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm)). [GOV.UK](https://design-system.service.gov.uk/components/pagination/) also says to send the user back to the first page when a filter changes.

## 2. Next is disabled from `total`

**Context.** The API returns `total` and `pageSize`. The README doesn't say what Next does on the last page.

**Decision.** Total pages is `Math.ceil(total / pageSize)`, and Next is disabled when the current page is at or past it.

**Alternatives.**
- Next always enabled. It would lead to an empty page.

**Consequences.**
- No extra request to find the end, but it relies on `total` being right. The mock computes it from the filtered list.

## 3. The controls are a card footer, not a `<tfoot>`

**Context.** The screenshots put Previous, "Page N" and Next below the table, inside the card.

**Decision.** They are a footer after the `<table>`, with a top border, shown only with the real table (not with an error or the skeleton). With one page of results they stay, both buttons disabled, so the layout doesn't jump.

**Alternatives.**
- A `<tfoot>` row. `tfoot` is for column summaries ([WHATWG](https://html.spec.whatwg.org/multipage/tables.html#the-tfoot-element), [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot)), screen readers would read the controls as a table row, and they would scroll sideways with the table on a phone.

**Consequences.**
- The controls stay on screen while the next page loads. Two disabled buttons show on a single page.

## 4. A bad page reads as 1; a page past the end redirects to page 1

**Context.** Anyone can type `?page=0`, `?page=abc` or `?page=99`. The mock answers a page past the end with 200, no rows and the full `total`.

**Decision.**
- Only the reader checks the URL: a `?page=` that isn't a positive whole number (digits only, a safe integer) reads as page 1, as an unknown currency reads as no filter. `setPage` trusts its callers, which only pass the current page ± 1 or 1.
- When a real response shows the page is above 1 and past the last page, `PaymentsPage` calls `setPage(1, { replace: true })`. The filters stay, and `replaceState` means Back never returns to the dead page. Placeholder data can't trigger it, because its total may belong to other filters.

**Alternatives.**
- Show "No payments found." with Previous enabled. It leaves a dead end.
- Jump to the last page. It needs a second request.
- Push instead of replace. Back would return to the dead page and redirect again.

**Consequences.**
- An outdated link still lands on data, as [GOV.UK](https://design-system.service.gov.uk/components/pagination/) advises, at the cost of one request that returns nothing.

## 5. Accessibility: a named `<nav>`, a live page label, and focus that moves

**Context.** Screen reader and keyboard users need to find the controls, hear the page change, and not lose focus. The graded tests also fix two details: they call `toBeDisabled()`, which checks the `disabled` attribute and ignores `aria-disabled` (jest-dom), and they query the buttons by the names "◀ Previous" and "Next ▶".

**Decision.**
- The controls sit in `<nav aria-label={I18N.PAGINATION_LABEL}>`, a new key `"Pagination"` that adds to a provided file without touching existing keys. The label follows the [WAI APG landmark guidance](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) (a unique name, no role word) and [WCAG technique ARIA11](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA11).
- "Page N" is `aria-live="polite"` and `aria-atomic="true"`. `PaymentsPage` passes the page of the response on screen, not the URL's, so the label and buttons agree with the dimmed rows while a later page loads, and the new "Page N" is announced only when its rows arrive.
- A button that becomes disabled would drop focus to `<body>`. `Pagination` records which button was clicked and, in a `useLayoutEffect`, moves focus to the other one if the clicked one is now disabled. It runs after the render because the other button may still be disabled at click time, and before paint so no frame shows focus on a disabled button. Only a click sets it; Back and URL loads don't. The render right after a click still shows the old page, so the effect depends on the page and acts only once it changes.
- Native `disabled` and the arrows in the names stay, as the graded tests require. `aria-disabled` would keep focus without this effect, but it fails `toBeDisabled()`.

**Alternatives.**
- A plain `<div>` (no landmark), or putting the page in the existing status region (it holds loading and errors).

**Consequences.**
- Keyboard users keep their place, and the visible label is the announcement.
- Unverified: how browsers treat focus on a button that becomes disabled, whether VoiceOver speaks both "Loading payments…" and "Page N", and how it reads the arrows.

## 6. Tests at three seams

**Context.** The graded Step 8 tests only check that both buttons exist and that Previous is disabled on page 1. They pass with pagination that never pages.

**Decision.** Three seams: the URL hook (`?page=` parsing, one history entry per move, the resets), `Pagination` alone (disabled states, `onPageChange` values, focus move, landmark and live label, no network) and the payments page against the mock server (request params, rows per page, filters kept, Back and Forward, resets, bad and past-the-end pages).

**Alternatives.**
- Hook and page only, or page only. The component's edge cases and the URL edge cases would be tested through the network.

**Consequences.**
- Some behaviour is checked twice (Previous disabled on page 1): the component tests check the edge cases, the page tests check the wiring.
