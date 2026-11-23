export const API_URL = "/api/payments";

// README: page=1, pageSize=5. pageSize is sent explicitly because the mock API defaults to 10.
export const DEFAULT_PAGE = 1;
export const PAGE_SIZE = 5;

// as const: the Currency type comes from this list, so a mistyped code fails to compile.
export const CURRENCIES = [
  "USD", "EUR", "GBP", "AUD", "CAD", "ZAR", "JPY", "CZK"
] as const;

export type Currency = (typeof CURRENCIES)[number];

// '' means no Currency filter ("Currencies" in the select).
export type CurrencyFilter = Currency | "";

// Only listed codes count, so an odd URL or form value never reaches the request.
export const isCurrency = (value: string | null): value is Currency =>
  CURRENCIES.some((currency) => currency === value);
