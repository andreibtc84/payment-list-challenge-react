# Step 5 decisions: Handle Server Error

The architecture and code decisions behind Step 5.

| # | Decision |
|---|---|
| 1 | [500 gets its own message; every other failure gets a generic one](#1-500-gets-its-own-message-every-other-failure-gets-a-generic-one) |
| 2 | [Keep `getErrorMessage` and give it a status → message map](#2-keep-geterrormessage-and-give-it-a-status--message-map) |
| 3 | [One shared set of page tests for every error message](#3-one-shared-set-of-page-tests-for-every-error-message) |

---

## 1. 500 gets its own message; every other failure gets a generic one

**Context.** The README's Step 5 asks for the i18n server-error message on a 500. After Step 4, every failure other than a 404 left an empty table with no explanation. The mock API also answers `401` with a 401, and `I18N.SOMETHING_WENT_WRONG` exists but no step uses it.

**Decision.**
- 404 → "Payment not found." (unchanged).
- 500 → "Internal server error. Please try again later.".
- Anything else (another status, a network error with no response, a non-HTTP error) → "Something went wrong!".
- No error → no message.

**Alternatives.**
- 500 only, the README's literal text. A 401 or a lost connection would still show a silent empty table.

**Consequences.**
- No failure goes unexplained. The generic case goes slightly beyond the README; our own tests cover it, the graded tests don't.
- The generic message can't say why the request failed. The user can't act differently on a 401 and a network loss here anyway.
- The message stays in the polite status region, the same as "Payment not found.", so the page has one live region. A real screen reader hasn't checked whether a server failure deserves an assertive alert instead.

## 2. Keep `getErrorMessage` and give it a status → message map

**Context.** Step 4 left two questions for Step 5. First, the API module imports UI text (`I18N`). Second, the message also decides whether the table shows. The Step 5 screenshot settles the second: on a 500 the box replaces the table, exactly as on a 404.

**Decision.**
- The helper stays next to `fetchPayments` and still returns i18n text. A `MESSAGE_BY_STATUS` map (`404`, `500`) replaced the single `if`, with the generic message as the default. Adding a status is one line.
- "No error" means `null`/`undefined`, which is how TanStack Query reports it, rather than any falsy value.
- Any message replaces the table. That's intended, not a side effect.

**Alternatives.**
- Return an error *kind* (`'not-found' | 'server-error' | 'unknown'`) and map it to text in the page. That's cleaner layering: the API module would stop knowing UI copy. But it touches the API, the page and both test files and changes no behaviour.
- Two `if` checks instead of the map. Fine for two codes. The code review preferred the map so a new status is a single entry.

**Consequences.**
- The page didn't change; Step 5 is one function and its tests.
- The API module still changes for wording as well as transport. If errors ever need their own actions (a retry button, say), switching to an error kind is the next step.

## 3. One shared set of page tests for every error message

**Context.** On the page, the 500 and generic messages behave exactly like "Payment not found.": the same region, the same hidden table, focus and recovery. Copying the 10 Step 4 tests twice would let the three paths drift apart.

**Decision.**
- The Step 4 block became one `describe.each` with three rows: `pay_404`, `pay_500` and `401`, each with its expected message. The test bodies are unchanged apart from the ID and the message.

**Alternatives.**
- A separate describe block per error. Each would be readable on its own, but most of it would be duplicated.
- A single page test for the generic case. This was the first version. The code review found it repeated the search steps and left the generic case's recovery untested, so it joined the shared block.

**Consequences.**
- 30 page tests from one block, so all three errors are checked for the same behaviour.
- Test names no longer say "not found", so the describe title (`PaymentsPage server error`, …) is what tells the runs apart in the output.
