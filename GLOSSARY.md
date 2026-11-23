# Glossary

**Payment**: A single charge made by a Customer, identified by a Payment ID (e.g. `pay_134_1`), with an Amount in a Currency, a Date and a Status.

**Payment ID**: The unique identifier of a Payment, prefixed `pay_`.

**Customer**: The person who made a Payment, shown by name.

**Amount**: The value of a Payment, expressed in its Currency.

**Currency**: The ISO 4217 code a Payment's Amount is denominated in (e.g. `USD`, `EUR`).

**Status**: Where a Payment is in its lifecycle. One of:
- **completed**: the payment succeeded.
- **pending**: the payment has not yet settled.
- **failed**: the payment did not succeed.
- **refunded**: the payment succeeded and was later returned to the Customer.

**Applied search**: The Payment ID search currently driving the table. It lives in the URL as `?search=`, trimmed, and is absent when there is no search.

**Draft**: The text currently typed in the search box. It becomes the Applied search only when Search is pressed (or Enter), and it follows the Applied search on page load and Back/Forward.

**Applied filter**: Any filter currently driving the table, held in the URL: the Applied search and the Currency filter. The Clear Filters button shows while at least one is applied, and clears them all.

**Currency filter**: The Currency currently driving the table. It lives in the URL as `?currency=` (one of the codes in `CURRENCIES`), and is absent when no Currency is chosen. An unlisted value counts as no Currency filter.

**Currency select**: The dropdown named "Filter by currency" that sets the Currency filter. Its first option, "Currencies", means no Currency filter; a choice applies immediately, without pressing Search.

**Not-found message**: The "Payment not found." text (`I18N.PAYMENT_NOT_FOUND`) shown in place of the table when the payments API answers an Applied search with HTTP 404 (for example `pay_404`).

**Server-error message**: The "Internal server error. Please try again later." text (`I18N.INTERNAL_SERVER_ERROR`) shown in place of the table when the payments API answers with HTTP 500 (for example `pay_500`).

**Fallback message**: The "Something went wrong!" text (`I18N.SOMETHING_WENT_WRONG`) shown in place of the table for any other failed request: another HTTP status (such as 401), a network error, or an unexpected non-HTTP error.

**Error message**: Any of the Not-found, Server-error or Fallback messages. Only one shows at a time, in the page's status region, in place of the table.

**Current page**: The page of results the table shows. It lives in the URL as `?page=`, a positive whole number, and is absent on page 1. A value that isn't a positive whole number counts as page 1. It is not an Applied filter.

**Total pages**: `ceil(total / pageSize)`, from the payments API response. Next is disabled when the Current page is at or past it.

**Pagination controls**: The Previous button, the "Page N" label and the Next button, in the table card's footer, inside a navigation landmark named "Pagination".
