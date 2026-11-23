import axios, { isAxiosError } from 'axios'
import { API_URL } from '../constants'
import { I18N } from '../constants/i18n'
import type { Pagination, PaymentSearchResponse } from '../types/payment'

// Its own name, so the request can grow without changing the response type.
export interface PaymentQueryParams extends Pagination {
  search?: string
}

// axios builds the query string from `params` and rejects on non-2xx responses.
export const fetchPayments = async (
  params: PaymentQueryParams,
): Promise<PaymentSearchResponse> => {
  const { data } = await axios.get<PaymentSearchResponse>(API_URL, { params })
  return data
}

// Keeps axios out of the UI: the page asks for a message and never inspects the HTTP error.
// Step 4 maps only 404; other errors get no message yet.
export const getErrorMessage = (error: unknown): string | undefined =>
  isAxiosError(error) && error.response?.status === 404
    ? I18N.PAYMENT_NOT_FOUND
    : undefined
