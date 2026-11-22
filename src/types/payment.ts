// A union, so typos fail to compile and each status maps to exactly one badge variant.
export type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded'

export interface Payment {
  id: string
  customerName: string
  amount: number
  customerAddress: string
  // Plain string: nothing in Step 1 needs a narrower Currency type.
  currency: string
  status: PaymentStatus
  date: string // UTC (e.g. "2024-04-15T10:00:00Z")
  description: string
  // Optional: in the README's response shape, but absent from the mock data.
  clientId?: string
}

// Shared by the request params and the response, which both carry the page position.
export interface Pagination {
  page: number
  pageSize: number
}

export interface PaymentSearchResponse extends Pagination {
  payments: Payment[]
  total: number
}
