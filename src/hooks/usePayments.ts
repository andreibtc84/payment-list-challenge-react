import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchPayments, type PaymentQueryParams } from '../api/payments'

// The key holds every param, so each page and page size is cached separately.
export const usePayments = (params: PaymentQueryParams) =>
  useQuery({
    queryKey: ['payments', params],
    queryFn: () => fetchPayments(params),
    // Keeps the old rows on screen while the next query loads, so the table doesn't flash.
    placeholderData: keepPreviousData,
  })
