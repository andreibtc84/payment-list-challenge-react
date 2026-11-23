import axios, { isAxiosError } from 'axios'
import { API_URL, type Currency } from '../constants'
import { I18N } from '../constants/i18n'
import { errorFields, track } from '../lib/telemetry'
import type { Pagination, PaymentSearchResponse } from '../types/payment'

// Its own name, so the request can grow without changing the response type.
export interface PaymentQueryParams extends Pagination {
  search?: string
  currency?: Currency
}

const statusClass = (status: number) => `${Math.floor(status / 100)}xx`

// axios builds the query string from `params` and rejects on non-2xx responses.
// Logs one event per request, then rethrows, so the UI path is unchanged.
export const fetchPayments = async (
  params: PaymentQueryParams,
): Promise<PaymentSearchResponse> => {
  const start = performance.now()
  // Never the search term: it can be a customer's name or a Payment ID.
  const fields = {
    page: params.page,
    pageSize: params.pageSize,
    hasSearch: Boolean(params.search?.trim()),
    currency: params.currency ?? '',
  }
  const durationMs = () => Math.round(performance.now() - start)
  try {
    const { data, status } = await axios.get<PaymentSearchResponse>(API_URL, { params })
    track('payments_fetch_succeeded', 'info', {
      ...fields,
      durationMs: durationMs(),
      outcome: 'success',
      statusClass: statusClass(status),
      status,
      resultCount: data.payments.length,
    })
    return data
  } catch (error) {
    // No response: offline, CORS, DNS and the like.
    const status = isAxiosError(error) ? error.response?.status : undefined
    track('payments_fetch_failed', status === 404 ? 'warn' : 'error', {
      ...fields,
      durationMs: durationMs(),
      outcome: status ? 'http_error' : 'network_error',
      statusClass: status ? statusClass(status) : 'network',
      status: status ?? 'network',
      message: errorFields(error).message,
    })
    throw error
  }
}

const MESSAGE_BY_STATUS: Partial<Record<number, string>> = {
  404: I18N.PAYMENT_NOT_FOUND,
  500: I18N.INTERNAL_SERVER_ERROR,
}

// Keeps axios out of the UI: the page asks for a message and never inspects the HTTP error.
export const getErrorMessage = (error: unknown): string | undefined => {
  // TanStack Query reports "no error" as null.
  if (error == null) return undefined
  const message =
    isAxiosError(error) && error.response
      ? MESSAGE_BY_STATUS[error.response.status]
      : undefined
  // Any other failure (other status, network, non-HTTP) still gets a message, never a silent empty table.
  return message ?? I18N.SOMETHING_WENT_WRONG
}
