import { useSyncExternalStore } from 'react'

export interface PaymentFilters {
  search: string
}

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

const parseFilters = (query: string): PaymentFilters => ({
  search: normaliseSearch(new URLSearchParams(query).get('search')),
})

const setFilters = (patch: Partial<PaymentFilters>) => {
  const current = parseFilters(window.location.search)
  const next = { ...current, ...patch }
  const search = normaliseSearch(next.search)
  // Compare parsed filters, not URL strings: re-applying the same filters must not add a Back step.
  if (search === current.search) return
  const url = new URL(window.location.href)
  if (search) url.searchParams.set('search', search)
  else url.searchParams.delete('search')
  window.history.pushState(null, '', url)
  listeners.forEach((notify) => notify())
}

export const usePaymentFilters = (): [PaymentFilters, typeof setFilters] => {
  const query = useSyncExternalStore(subscribe, getSnapshot)
  const filters = parseFilters(query)
  return [filters, setFilters]
}
