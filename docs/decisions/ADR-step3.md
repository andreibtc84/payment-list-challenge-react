# Step 3 decisions: Clear Filters

The architecture and code decisions behind Step 3.

| # | Decision |
|---|---|
| 1 | [The button shows only while a filter is applied](#1-the-button-shows-only-while-a-filter-is-applied) |
| 2 | [Clearing writes the URL and adds a history entry](#2-clearing-writes-the-url-and-adds-a-history-entry) |
| 3 | [An optional `onClear` prop decides whether the button renders](#3-an-optional-onclear-prop-decides-whether-the-button-renders) |
| 4 | [A `type="button"` inside the search form](#4-a-typebutton-inside-the-search-form) |
| 5 | [Focus moves to the search input after clearing](#5-focus-moves-to-the-search-input-after-clearing) |
| 6 | [The starter's grey, as Tailwind `gray-500` / `gray-600`](#6-the-starters-grey-as-tailwind-gray-500--gray-600) |
| 7 | [Tests: the page seam, one hook test, and jest-dom matchers](#7-tests-the-page-seam-one-hook-test-and-jest-dom-matchers) |
| 8 | [Hide the browser's own × in the search box](#8-hide-the-browsers-own--in-the-search-box) |

---

## 1. The button shows only while a filter is applied

**Context.** The README says to show Clear Filters "when any filter is active" and hide it otherwise. It doesn't say whether text typed into the box, but not yet searched, counts.

**Decision.**
- A filter is active when it's applied: it's in the URL and filtering the table. In Step 3 that's `?search=`.
- Typed but unsearched text doesn't show the button.

**Alternatives.**
- Also show the button while the box has text. It would then double as "empty the box", which blurs what it does. Browsers already offer a native × in `type="search"` boxes for that.

**Consequences.**
- The button always matches the URL: on page load with a shared link, after a search, and on Back/Forward.
- The button mounts and unmounts, so focus needs care (decision 5).
- When the currency filter arrives (Step 6), "any filter" has to include it.

## 2. Clearing writes the URL and adds a history entry

**Context.** The URL is the source of truth for the applied search (Step 2). Clearing could add a history entry or replace the current one.

**Decision.**
- Clearing calls the existing `setFilters({ search: '' })`. That removes the param, keeps the path and any other params, adds a history entry with `pushState`, and notifies subscribers. The hook doesn't change.
- The input empties through the existing "draft follows the URL" sync. No new state is needed.

**Alternatives.**
- `replaceState`. One fewer history entry, but Back couldn't undo an accidental clear, and it would behave differently from a search.

**Consequences.**
- Back after Clear brings the search back, in both the input and the table. Forward clears it again.
- Usability research (Baymard Institute) finds users expect Back to undo filter changes. Replacing the entry makes most sense for changes that fire on every keystroke, and Clear is one deliberate click.

## 3. An optional `onClear` prop decides whether the button renders

**Context.** `PaymentsPage` knows which filters are applied. `SearchForm` draws the controls.

**Decision.**
- `SearchForm` takes an optional `onClear?: () => void`. The button renders only when it's passed.
- `PaymentsPage` works out `hasAppliedFilters` from the URL, and passes `onClear` only then. The same boolean decides whether `search` is sent to the API.

**Alternatives.**
- A `canClear` boolean plus `onClear`. More explicit, but two props that must agree, and a handler passed even when it can't be used.
- `SearchForm` decides from its `term` prop. Fewest props now, but at Step 6 the "any filter" rule would live in the form and need the currency passed in.

**Consequences.**
- The button can't be shown without a handler.
- The "any filter applied" rule lives in one place for Step 6 to extend. At Step 6 the `search` param must go back to checking `filters.search` itself, or a currency-only filter would send an empty `search`.

## 4. A `type="button"` inside the search form

**Context.** The screenshot puts Clear Filters in the same row as the search box and the Search button.

**Decision.**
- The button sits in the existing `<form role="search">`, after Search, as `type="button"`.

**Alternatives.**
- A separate component outside the form. Looser coupling, but the button would fall outside the search landmark, and laying out one row across two components is more awkward.
- `type="reset"`. Rejected: a reset puts the input back to its initial value (the old term, not empty) and doesn't touch the URL.
- The default `type="submit"`. Rejected: it would run a search.

**Consequences.**
- Screen-reader users find every search and filter control in one landmark. The HTML standard's `<search>` element, the native form of this landmark, is defined for controls "related to performing a search or filtering operation".
- Enter in the search box still runs a search while the button is shown (tested).

## 5. Focus moves to the search input after clearing

**Context.** Clicking Clear Filters hides the button. Without help, keyboard focus would drop to `<body>`, and keyboard and screen-reader users would lose their place (WCAG 2.4.3).

**Decision.**
- A ref on the search input. The click handler calls `onClear()`, then focuses the input. The input stays mounted, so focusing it straight away is safe.

**Alternatives.**
- Focus the Search button. It stays near where the user was, but it's `aria-disabled` while the box is empty, so focus would land on a control that does nothing.
- Focus the heading or the table. Less useful, and the heading would need `tabindex="-1"`.

**Consequences.**
- The likely next action, a new search, is one keystroke away, and screen readers announce the empty search box.
- A test checks that focus survives both the button unmounting and the full list reloading. Removing the `focus()` call makes 3 tests fail.

## 6. The starter's grey, as Tailwind `gray-500` / `gray-600`

**Context.** The screenshot shows a grey Clear Filters button. The starter's styled components define a `ClearButton`.

**Decision.**
- The shared `Button` with `className='shrink-0 bg-gray-500 hover:bg-gray-600'`. Those are exactly the starter's `#6b7280` and hover `#4b5563`. tailwind-merge makes the grey override the default blue.
- Height, radius and the 2px focus outline come from the shared `Button`.

**Alternatives.**
- Arbitrary hex values (`bg-[#6b7280]`), matching the style of the other shared components. The same colours, less readable.
- A `variant` prop on `Button`. Reusable, but a new API for one use.

**Consequences.**
- Sampled from the screenshot: `#6a727f`, within one unit of `#6b7280`.
- Contrast: white text on the grey is 4.83:1 (AA needs 4.5:1), on the hover 7.56:1. The grey against the page is 4.63:1, and the focus outline against the page is 9.14:1.
- The button is 36px tall, above the 24×24 minimum target size.
- Checked in real Chrome at 1280, 640 and 320px: correct colours and outline, no horizontal scroll, and at 320px the controls stack.

## 7. Tests: the page seam, one hook test, and jest-dom matchers

**Context.** Step 2 tests at the page seam and the URL hook seam. Clearing adds no hook behaviour.

**Decision.**
- **Page seam:** 13 new tests in `PaymentsPage.test.tsx`, using user-event and the MSW Node server:
  - when the button shows and hides;
  - what clicking it does (the input, the URL, the rows, unsearched edits);
  - Back/Forward;
  - focus;
  - the keyboard (Enter and Space, and Enter in the box still searching).
- **Hook seam:** one test that clearing adds exactly one history entry.
- **Matchers:** the test setup loads `@testing-library/jest-dom/vitest`, so presence and absence read as `toBeInTheDocument()` / `not.toBeInTheDocument()`, the same matchers as the graded tests. This applies across the whole page test file.

**Alternatives.**
- The page seam only. The Back test already covers the history entry, but the hook test fails right next to the cause.
- A bare `getBy…` call with no `expect`. Shorter, but the assertion is implicit.

**Consequences.**
- Most Step 3 tests passed on their first run, because the URL hook and the draft sync already did the work. The focus and keyboard tests failed first, as test-first expects.
- Checked by breaking the code on a copy: clearing with `replaceState` fails the Back/Forward test, and removing the `focus()` call fails the three focus tests.

## 8. Hide the browser's own × in the search box

**Context.** Chrome, Edge and Safari draw their own × in a `type="search"` box. It only empties the box and leaves the applied search alone, so next to Clear Filters it's a second, weaker "clear".

**Decision.**
- The search input gets `[&::-webkit-search-cancel-button]:appearance-none`, scoped to that one input.

**Alternatives.**
- Keep the ×. A familiar browser convention, but two clear actions that do different things.
- The same rule in global CSS. It affects every search box and sits further from the component.

**Consequences.**
- One clear action, and the box matches the screenshot, which shows no ×.
- Checked in real Chrome. Firefox never draws the ×. Safari uses the same pseudo-element but hasn't been checked.
