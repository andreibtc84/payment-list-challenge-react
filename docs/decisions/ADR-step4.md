# Step 4 decisions: Handle Payment Not Found

The architecture and code decisions behind Step 4.

| # | Decision |
|---|---|
| 1 | [Only 404 gets a message in Step 4](#1-only-404-gets-a-message-in-step-4) |
| 2 | [The message lives in the page's one always-rendered status region](#2-the-message-lives-in-the-pages-one-always-rendered-status-region) |
| 3 | [A `getErrorMessage` helper in the API module](#3-a-geterrormessage-helper-in-the-api-module) |
| 4 | [The starter's error colours, with an icon, as wide as the input](#4-the-starters-error-colours-with-an-icon-as-wide-as-the-input) |
| 5 | [Tests: the page seam plus a unit test for the helper](#5-tests-the-page-seam-plus-a-unit-test-for-the-helper) |

---

## 1. Only 404 gets a message in Step 4

**Context.** Before Step 4, any failed request left an empty table. The README's Step 4 is about 404 only; Step 5 is about 500.

**Decision.**
- A 404 shows `I18N.PAYMENT_NOT_FOUND`. Every other failure (500, 401, network) keeps the old behaviour until Step 5.

**Alternatives.**
- A generic fallback now, using the existing `I18N.SOMETHING_WENT_WRONG`. No silent empty table, but it goes beyond the Step 4 requirements and pre-empts Step 5's design.

**Consequences.**
- Between Step 4 and Step 5 a server error still shows an empty table. Step 5 closes that gap.

## 2. The message lives in the page's one always-rendered status region

**Context.** The message has to reach screen-reader users without moving focus. The graded test finds it with `getByText`, which fails if the same text appears twice, so it can't be copied into a hidden live region as well as shown.

**Decision.**
- The page already had a `role="status"` region for "Loading payments…". It's now always rendered and holds both: the loading text in an `sr-only` span, and the visible red box on a 404.
- The box replaces the table, as in the screenshot. Focus doesn't move.

**Alternatives.**
- A `role="alert"` box added together with its text. MDN says adding an already-filled alert "generally does *not* lead to an announcement", and WCAG technique ARIA19 says the container must be in the page first.
- An always-rendered `role="alert"`. It interrupts, and WCAG failure F103 is about using alert for content that isn't urgent. WCAG's status-messages guidance gives "No results returned" after a search as a status message.
- A second status region just for errors. It was built first, but it made "the" status region ambiguous: two existing loading tests found it by role and broke. One region avoids that, and loading and error text never show at once.

**Consequences.**
- The message is announced politely when it appears, each time it appears.
- One region serves two messages. That holds only because they're mutually exclusive: loading clears when the query settles, and the message appears only after it settles with a 404.

## 3. A `getErrorMessage` helper in the API module

**Context.** TanStack Query hands the page the raw error, here an `AxiosError`. Something has to check the status and choose the i18n text. The README fixes the behaviour, not where that check lives, and the TanStack Query docs and TkDodo's posts don't settle it either (their examples narrow with `isAxiosError` where the error is used).

**Decision.**
- `getErrorMessage(error: unknown): string | undefined` sits next to `fetchPayments`. It returns `I18N.PAYMENT_NOT_FOUND` for an axios 404 and `undefined` otherwise. The page calls it and never imports axios.

**Alternatives.**
- `fetchPayments` throws its own `PaymentNotFoundError`, and the page checks `instanceof`. The cleanest boundary, but the most code (a class plus a try/catch).
- The `isAxiosError` check inline in the page. The least code, but it ties the page to the HTTP client and can only be tested by rendering the page.

**Consequences.**
- axios details stay in one module, and the mapping has its own fast unit tests.
- The API module now imports the UI copy, and the message also decides whether the table shows. Both are worth revisiting when Step 5 adds a second error.

## 4. The starter's error colours, with an icon, as wide as the input

**Context.** The screenshot shows a plain, full-width, light-red box with dark-red text. The starter's styled-components `ErrorBox` uses `#fee2e2` and `#b91c1c`. The plain box looked unfinished next to the search row.

**Decision.**
- Tailwind classes on the box: `bg-red-100 text-red-700`, rounded and padded. Tailwind v3's `red-100` and `red-700` are exactly the starter's two hex values.
- A thin `border-red-200`, and a small inline SVG alert icon before the text. The icon is `aria-hidden` and uses `currentColor`. There's no icon library, so it's two shapes drawn inline.
- The box uses `sm:w-1/2`, the same width class as the search input, so their edges line up. Below 640px both are full width.

**Alternatives.**
- Reuse the starter's `ErrorBox`. Same colours, but it brings styled-components back into a page styled with Tailwind.
- Add a hint line ("Check the Payment ID and try again"). Friendlier, but it's new copy the README doesn't provide, so it would need a new i18n string.
- Copy shadcn's `Alert` component. Reusable for Step 5, but more code for one message today.
- Keep the plain full-width box from the screenshot.

**Consequences.**
- Contrast is 5.30:1, above AA's 4.5:1, and the icon shares that colour. The icon is a cue beyond colour; the text alone still carries the meaning.
- Checked in real Chrome at 1280, 887, 640 and 320px: the box's edges match the input's, axe finds no violations, and nothing scrolls sideways.
- The look now goes beyond the screenshot. The graded test only checks the text.

## 5. Tests: the page seam plus a unit test for the helper

**Context.** Earlier steps test at the page seam, with pure functions unit-tested on their own.

**Decision.**
- **Page seam:** 10 tests: where the message appears and that its region existed first, the table hidden, what stays, focus, a page load with `?search=pay_404`, recovery through Clear Filters and a new search, and Back/Forward.
- **Unit seam:** `getErrorMessage` with errors built from axios's own `AxiosError` class, so it sees the same shape a real request rejects with.

**Alternatives.**
- The page seam only. One seam, but the non-404 cases would each need a mock-server override.

**Consequences.**
- The helper tests and the first page tests failed before the code existed, as test-first expects. Most recovery tests passed on their first run: Clear Filters, the URL hook and the query already did the work, so they guard that behaviour from now on.
- A check before building showed that after a 404 the query holds no data, so no old rows can linger under the message.
