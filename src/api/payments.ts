import axios, { isAxiosError } from 'axios'
import { API_URL, type Currency } from '../constants'
import { I18N } from '../constants/i18n'
import type { Pagination, PaymentSearchResponse } from '../types/payment'

// Its own name, so the request can grow without changing the response type.
export interface PaymentQueryParams extends Pagination {
  search?: string
  currency?: Currency
}

// axios builds the query string from `params` and rejects on non-2xx responses.
export const fetchPayments = async (
  params: PaymentQueryParams,
): Promise<PaymentSearchResponse> => {
  const { data } = await axios.get<PaymentSearchResponse>(API_URL, { params })
  return data
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
