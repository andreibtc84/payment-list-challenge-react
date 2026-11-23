import { useSyncExternalStore } from 'react'
import { isCurrency, type CurrencyFilter } from '../constants'

export interface PaymentFilters {
  search: string
  currency: CurrencyFilter
}

// Comparing and writing both walk this list, so a new filter key is added in one place.
const FILTER_KEYS = ['search', 'currency'] as const

const listeners = new Set<() => void>()

const subscribe = (onChange: () => void) => {
  listeners.add(onChange)
  // pushState fires no event, so our own writes notify via `listeners`; Back/Forward fire popstate.
  window.addEventListener('popstate', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('popstate', onChange)
  }
}

const getSnapshot = () => window.location.search

const normaliseSearch = (value: string | null | undefined): string => value?.trim() ?? ''

const parseFilters = (query: string): PaymentFilters => {
  const params = new URLSearchParams(query)
  const currency = params.get('currency')
  return {
    search: normaliseSearch(params.get('search')),
    currency: isCurrency(currency) ? currency : '',
  }
}

const setFilters = (patch: Partial<PaymentFilters>) => {
  const current = parseFilters(window.location.search)
  const next: PaymentFilters = { ...current, ...patch }
  next.search = normaliseSearch(next.search)
  // Compare parsed filters, not URL strings: re-applying the same filters must not add a Back step.
  if (FILTER_KEYS.every((key) => next[key] === current[key])) return
  const url = new URL(window.location.href)
  // Empty means "no filter", so the param is removed rather than written as `key=`.
  for (const key of FILTER_KEYS) {
    if (next[key]) url.searchParams.set(key, next[key])
    else url.searchParams.delete(key)
  }
  window.history.pushState(null, '', url)
  listeners.forEach((notify) => notify())
}

export const usePaymentFilters = (): [PaymentFilters, typeof setFilters] => {
  const query = useSyncExternalStore(subscribe, getSnapshot)
  const filters = parseFilters(query)
  return [filters, setFilters]
}
