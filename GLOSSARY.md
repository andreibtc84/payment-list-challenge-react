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
