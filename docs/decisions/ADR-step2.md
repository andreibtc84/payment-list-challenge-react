# Step 2 decisions: search by Payment ID

The architecture and code decisions behind Step 2.

| # | Decision |
|---|---|
| 1 | [The URL is the source of truth for the applied search](#1-the-url-is-the-source-of-truth-for-the-applied-search) |
| 2 | [A small `usePaymentFilters` hook](#2-a-small-usepaymentfilters-hook) |
| 3 | [Every search adds a history entry, unless nothing changed](#3-every-search-adds-a-history-entry-unless-nothing-changed) |
| 4 | [`SearchForm` owns the draft; the draft follows the URL](#4-searchform-owns-the-draft-the-draft-follows-the-url) |
| 5 | [Search form semantics: a search landmark, a hidden label, an `aria-disabled` button](#5-search-form-semantics-a-search-landmark-a-hidden-label-an-aria-disabled-button) |
| 6 | [Trim the term and send no empty `search` param](#6-trim-the-term-and-send-no-empty-search-param) |
| 7 | [Keep the previous rows, dimmed, while a search loads](#7-keep-the-previous-rows-dimmed-while-a-search-loads) |
| 8 | [A shared `Button` and `Input`, in the starter's colours](#8-a-shared-button-and-input-in-the-starters-colours) |
| 9 | [Tests: the page seam plus the URL hook, with user-event and a URL reset](#9-tests-the-page-seam-plus-the-url-hook-with-user-event-and-a-url-reset) |

---

## 1. The URL is the source of truth for the applied search

**Context.** The README asks for a search that queries the API. An operator looking up a payment also wants to reload, share a link, and use Back to undo a search. Steps 6 (currency) and 8 (page) add more filters of the same kind.

**Decision.**
- The applied search lives in `?search=` and nowhere else. `PaymentsPage` reads it from the URL and passes it to the query.
- The form keeps only what is being typed (the draft). Submitting writes the URL; it doesn't set React state.
- Steps 6 and 8 will add `currency` and `page` to the same URL state.

**Alternatives.**
- React state only. The least work, but a reload or a shared link loses the search, and Back leaves the page.
- React state that also writes the URL. Rejected: two sources that drift apart, for example on Back.
- Write the URL but never read it. Rejected: a reload would show a term that isn't applied.

**Consequences.**
- Reload, bookmarks, shared links and Back/Forward all show the same search, in both the input and the table.
- The URL persists between tests in the same file, so tests need a reset (decision 9).
- It goes beyond the README's Step 2 requirements, at the cost of one small hook.

## 2. A small `usePaymentFilters` hook

**Context.** Reading and writing the URL in React needs a subscription to Back/Forward, and `history.pushState` doesn't fire `popstate`.

**Decision.**
- `usePaymentFilters()` returns `[filters, setFilters]`, where `filters` is `{ search: string }` in Step 2.
- It reads with `useSyncExternalStore`. The snapshot is the `location.search` string, which is stable, and `filters` is parsed from it with `useMemo`, so the object keeps its identity until the URL changes.
- It subscribes to `popstate` and to its own change notifications, which it sends after each `pushState`.
- `setFilters(patch)` merges a partial into the current filters, so a later currency change can't drop the search.
- Writes start from `location.href`, which keeps the GitHub Pages base path and any query params the app doesn't know.
- Empty values are deleted from the URL, never written.

**Alternatives.**
- TanStack Router. The strongest typing, but far more than one page needs.
- A generic `useUrlState<T>(defaults, parsers)`. Rejected: that's a small URL-state library to write and maintain. The hook is payments-specific on purpose.

**Consequences.**
- About 40 lines with no dependency, and every line can be explained.
- We own the edge cases: the base path, unknown params, and notifying on our own writes. Each has a test.
- If parsing `page` (Step 8) gets noisy, a URL-state library with typed parsers is the upgrade.

## 3. Every search adds a history entry, unless nothing changed

**Context.** Back should undo a search, and it should never look like it did nothing.

**Decision.**
- A search uses `pushState`, so Back returns to the previous search or to all payments.
- If the new filters equal the current ones, nothing is pushed. The check compares the parsed values, not URL strings, because writing a param re-encodes the whole query (`%20pay_134_1%20` becomes `pay_134_1`).

**Alternatives.**
- `replaceState`. Rejected: Back would leave the page, so a search couldn't be undone.
- Compare URL strings. Rejected: writing re-encodes the query, so opening `?search=%20pay_134_1%20` and searching `pay_134_1` again would push an entry with nothing visible changed.

**Consequences.**
- Many searches mean many history entries.
- When currency is added (Step 6), the comparison has to cover every filter, not only `search`.

## 4. `SearchForm` owns the draft; the draft follows the URL

**Context.** Typing must not fire requests, and the input has to show the applied search after a reload or Back/Forward without losing focus.

**Decision.**
- `SearchForm` takes `{ term, onSearch }`. It holds the draft in `useState` and reports a submit through `onSearch(draft)`.
- When the `term` prop changes (on load or Back/Forward), the form resets the draft during render. This is the React docs pattern "adjusting some state when a prop changes", with the last seen `term` kept in state.
- The term stays in the input after a search. React 19 resets a form only when its `action` is a function, and this form uses `onSubmit` with `preventDefault()`.

**Alternatives.**
- `key={term}` to remount the form. Rejected: the term changes on every search, so focus would jump to `<body>` (WCAG 2.4.3).
- A `useEffect` that copies `term` into the draft. Rejected: an extra render, a possible flash of old text, and the React docs advise against it.
- react-hook-form with its `values` option. It would do the same sync declaratively, but it's a dependency for one field with no validation.

**Consequences.**
- Focus stays on the control used to submit (a test checks both the button and Enter).
- If the operator clears the box and leaves it empty, the input and the table disagree until the next search or Back/Forward. Clearing the applied search is Step 3's Clear Filters.

## 5. Search form semantics: a search landmark, a hidden label, an `aria-disabled` button

**Context.** The screenshot shows an input with a placeholder and a Search button, but no visible label. WCAG 2.2 AA is required.

**Decision.**
- `<form role="search">`, so screen-reader users can jump to it as a landmark. Click and Enter go through the same submit handler.
- `<input type="search">`, which is announced as a search box.
- A visually hidden `<label>` "Search payments" (`I18N.SEARCH_LABEL`). The placeholder isn't a reliable accessible name, and the name starts with the visible word "Search", which voice control relies on (WCAG 2.5.3). The adjacent Search button acts as the visible label (WCAG technique G167).
- While the trimmed draft is empty, the button has `aria-disabled="true"` and shows a not-allowed cursor. It keeps its full blue, as in the screenshot, and doesn't darken on hover. The submit handler ignores clicks and Enter in that state. The attribute is left off entirely when there is text.

**Alternatives.**
- A `<div>` and a button `onClick`. Rejected: Enter wouldn't search, and there'd be no landmark.
- The `<search>` element. It needs no role, but `role="search"` on a form has wider support.
- A native `disabled` button. Rejected: it leaves the Tab order, so screen-reader users may not find it or learn why.

**Consequences.**
- No visible label, matching the screenshot. Sighted users rely on the placeholder and the adjacent button.
- Because the button stays clickable, the handler's guard matters. A test proves an empty submit doesn't clear an applied search.

## 6. Trim the term and send no empty `search` param

**Context.** A pasted `  pay_134_1 ` would otherwise match nothing, and an empty search shouldn't change the request.

**Decision.**
- The hook trims on read and on write, with one `normaliseSearch` function. `?search=%20pay_1%20` reads as `pay_1`.
- `PaymentsPage` adds `search` to the API params only when it isn't empty. With no search, the request and the query key are exactly Step 1's, so the cache is shared.

**Consequences.**
- The "empty means absent" rule appears in two layers: the hook (URL) and the page (API params). A shared helper was rejected because it would tie the URL format to the API format.

## 7. Keep the previous rows, dimmed, while a search loads

**Context.** A new search is a new query key, so `useQuery` goes back to pending and the table swapped to the skeleton on every search. That looked like a page refresh.

**Decision.**
- `usePayments` sets `placeholderData: keepPreviousData`, so every payments query keeps the previous rows until the next one resolves. The currency filter and pagination will get the same behaviour.
- The skeleton shows only on the first load.
- While placeholder rows show, the table has `aria-busy="true"` and `opacity-90`, and the screen-reader status says "Loading payments…".
- The status is driven by `isPending || isPlaceholderData`, not `isFetching`, which would also announce silent background refetches (for example on window focus).

**Alternatives.**
- The skeleton again on every search. Consistent with the first load, but the table flashes.
- `opacity-60`. A clearer dim, but the worst text drops to 2.66:1. `opacity-75` is still 3.60:1. Only `opacity-90` keeps every cell at 4.5:1 or better (worst case 4.67:1).
- No dimming plus a progress bar. A clearer cue, but a new visual element the screenshots don't have.

**Consequences.**
- The dim is subtle. `aria-busy` and the status carry most of the signal.
- Steps 4–5 must decide what replaces the rows when the next query errors.

## 8. A shared `Button` and `Input`, in the starter's colours

**Context.** Step 1 copied shadcn's table, badge and skeleton onto the provided Tailwind v3. Steps 3 and 8 need more buttons.

**Decision.**
- `ui/button.tsx` is our own shared button: one default look (no variants yet), the focus outline, and `aria-disabled:` styles (not-allowed cursor, no hover change). It has no dependencies beyond `cn()`.
- `ui/input.tsx` is based on shadcn's v3 input, with the starter's colours and the same focus outline.
- Colours come from the starter's styled components: the button `rgb(61,108,209)` with white text (4.92:1), hover `rgb(33,65,154)`, and the input's focus border `rgb(61,70,83)`.
- Two changes for contrast. The input border and placeholder use the starter's `#6b7280` (4.83:1) instead of its `#d1d5db` (1.47:1, below the 3:1 the field's only visible edge needs). The focused button and input both get a 2px `rgb(61,70,83)` outline (9.14:1), because the starter's 40% ring alone is 1.60:1 against the page, and the input's border change alone is a weak cue.
- Layout follows the screenshot: from 640px (`sm`) up, the input is half the content width with the button 16px to its right. Below 640px (phones) they stack, with the input full width and the button under it.

**Alternatives.**
- Plain Tailwind classes in `SearchForm`. Less code now, but Steps 3 and 8 would repeat the button classes.
- Tailwind's `blue-600`. 5.17:1, but not the starter's colour.

**Consequences.**
- The input border is darker than in the screenshot.
- The button's 4.92:1 leaves little headroom, so any tint change has to be rechecked.

## 9. Tests: the page seam plus the URL hook, with user-event and a URL reset

**Context.** Step 1 tests only at the page seam. The URL hook has edge cases a user can't easily trigger through the page, and URL state leaks between tests.

**Decision.**
- **Page seam:** `src/components/PaymentsPage.test.tsx`, with a fresh `QueryClient` and the MSW Node server, as in Step 1.
- **Hook seam:** `src/hooks/usePaymentFilters.test.ts` uses `renderHook`, through the hook's return value only.
- **Interactions** use `@testing-library/user-event` (pinned at 14.6.13), so Enter really submits the form and focus moves as in a browser. The graded file keeps its `fireEvent` calls.
- **URL reset:** `src/test/setup.ts`, registered in `vitest.config.ts`, calls `history.replaceState(null, '', '/')` after every test. The graded tests share one `<App />` setup, and without the reset one step's search would leak into the next.
- **Loading tests** hold the search response with an MSW handler until the test releases it. `afterEach` also releases it, so a failing test can't leave a pending request.

**Alternatives.**
- The page seam only. One seam, but the hook's edge cases would only be proved indirectly.
- `fireEvent` only. In jsdom, `fireEvent.keyDown(Enter)` doesn't submit a form, so the keyboard path couldn't be tested.

**Consequences.**
- Renaming the hook means editing its tests.
- Back/Forward is tested with jsdom's `history.back()`, which fires `popstate`. A real-browser test (Playwright) is the next step.
