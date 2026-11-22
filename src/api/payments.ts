import axios from 'axios'
import { API_URL } from '../constants'
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
