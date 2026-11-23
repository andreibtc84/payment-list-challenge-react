import { useSyncExternalStore } from 'react'
import { isCurrency, type CurrencyFilter } from '../constants'

export interface PaymentFilters {
  search: string
  currency: CurrencyFilter
}

export interface PaymentListState extends PaymentFilters {
  page: number
}

// Comparing and writing both walk this list, so a new filter key is added in one place.
const FILTER_KEYS = ['search', 'currency'] as const
// Not a filter, so it stays out of FILTER_KEYS.
const PAGE_KEY = 'page'

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

const readPage = (query: string): number => {
  const value = new URLSearchParams(query).get(PAGE_KEY) ?? ''
  const page = Number(value)
  // Digits only: Number() alone would accept "1e3", "0x10" or " 2".
  return /^\d+$/.test(value) && Number.isSafeInteger(page) && page > 0 ? page : 1
}

const parseFilters = (query: string): PaymentFilters => {
  const params = new URLSearchParams(query)
  const currency = params.get('currency')
  return {
    search: normaliseSearch(params.get('search')),
    currency: isCurrency(currency) ? currency : '',
  }
}

// Replace is for corrections (a page past the end), which must not add a Back step.
const writeUrl = (url: URL, replace = false) => {
  if (replace) window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
  listeners.forEach((notify) => notify())
}

const setFilters = (patch: Partial<PaymentFilters>) => {
  const current = parseFilters(window.location.search)
  const next: PaymentFilters = { ...current, ...patch }
  next.search = normaliseSearch(next.search)
  // Same filters add no Back step, unless a page param (even junk) is left to remove.
  const unchanged = FILTER_KEYS.every((key) => next[key] === current[key])
  const url = new URL(window.location.href)
  if (unchanged && !url.searchParams.has(PAGE_KEY)) return
  url.searchParams.delete(PAGE_KEY)
  // Empty means "no filter", so the param is removed rather than written as `key=`.
  for (const key of FILTER_KEYS) {
    if (next[key]) url.searchParams.set(key, next[key])
    else url.searchParams.delete(key)
  }
  writeUrl(url)
}

const setPage = (page: number, options?: { replace?: boolean }) => {
  // Re-selecting the current page must not add a Back step.
  if (page === readPage(window.location.search)) return
  const url = new URL(window.location.href)
  if (page > 1) url.searchParams.set(PAGE_KEY, String(page))
  else url.searchParams.delete(PAGE_KEY)
  writeUrl(url, options?.replace)
}

export const usePaymentFilters = (): [PaymentListState, typeof setFilters, typeof setPage] => {
  const query = useSyncExternalStore(subscribe, getSnapshot)
  const state: PaymentListState = {
    ...parseFilters(query),
    page: readPage(query),
  }
  return [state, setFilters, setPage]
}
