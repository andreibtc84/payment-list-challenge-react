import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePaymentFilters } from './usePaymentFilters'

// history.back() leaves the cursor behind the newest entry; the next pushState would drop the forward
// entries and break later history.length checks.
const returnToLatestEntry = async (hasReturned: () => void) => {
  act(() => window.history.forward())
  await waitFor(hasReturned)
}

describe('usePaymentFilters', () => {
  it('should return no Payment ID search and no Currency filter when the URL has no params', () => {
    const { result } = renderHook(() => usePaymentFilters())

    expect(result.current[0]).toEqual({ search: '', currency: '', page: 1 })
  })

  it('should read the Currency filter from the URL', () => {
    window.history.replaceState(null, '', '/?currency=EUR')

    const { result } = renderHook(() => usePaymentFilters())

    expect(result.current[0].currency).toBe('EUR')
  })

  it.each(['XYZ', 'usd', ''])(
    'should read no Currency filter when the URL holds the unlisted currency "%s"',
    (currency) => {
      window.history.replaceState(null, '', `/?currency=${currency}`)

      const { result } = renderHook(() => usePaymentFilters())

      expect(result.current[0].currency).toBe('')
    },
  )

  it('should read the Payment ID search from the URL', () => {
    window.history.replaceState(null, '', '/?search=pay_134_1')

    const { result } = renderHook(() => usePaymentFilters())

    expect(result.current[0].search).toBe('pay_134_1')
  })

  it('should trim the Payment ID search read from the URL', () => {
    window.history.replaceState(null, '', '/?search=%20pay_134_1%20')

    const { result } = renderHook(() => usePaymentFilters())

    expect(result.current[0].search).toBe('pay_134_1')
  })

  it('should update the filters and the URL when a Payment ID search is set', () => {
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ search: 'pay_134_1' }))

    expect(result.current[0].search).toBe('pay_134_1')
    expect(window.location.search).toBe('?search=pay_134_1')
    expect(window.history.length).toBe(entries + 1)
  })

  it('should write the trimmed Payment ID search to the URL', () => {
    const { result } = renderHook(() => usePaymentFilters())

    act(() => result.current[1]({ search: '  pay_134_1 ' }))

    expect(window.location.search).toBe('?search=pay_134_1')
  })

  it('should remove the search param from the URL when the Payment ID search is cleared', () => {
    window.history.replaceState(null, '', '/?search=pay_134_1')
    const { result } = renderHook(() => usePaymentFilters())

    act(() => result.current[1]({ search: '' }))

    expect(window.location.search).toBe('')
    expect(result.current[0].search).toBe('')
  })

  it('should add a history entry when the Payment ID search is cleared', () => {
    window.history.replaceState(null, '', '/?search=pay_134_1')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ search: '' }))

    expect(window.history.length).toBe(entries + 1)
  })

  it('should not add a history entry when the Payment ID search is already applied', () => {
    window.history.replaceState(null, '', '/?search=pay_134_1')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ search: ' pay_134_1 ' }))

    expect(window.history.length).toBe(entries)
  })

  it('should not add a history entry when the URL holds the applied Payment ID search with spaces', () => {
    window.history.replaceState(null, '', '/?search=%20pay_134_1%20')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ search: 'pay_134_1' }))

    expect(window.history.length).toBe(entries)
    expect(window.location.search).toBe('?search=%20pay_134_1%20')
  })

  it('should keep the path and unknown params when the Payment ID search is set', () => {
    window.history.replaceState(null, '', '/base/?foo=1')
    const { result } = renderHook(() => usePaymentFilters())

    act(() => result.current[1]({ search: 'pay_134_1' }))

    expect(window.location.pathname).toBe('/base/')
    expect(window.location.search).toBe('?foo=1&search=pay_134_1')
  })

  it('should write the Currency filter to the URL, keeping the Payment ID search, in one history entry', () => {
    window.history.replaceState(null, '', '/?search=pay_134')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ currency: 'USD' }))

    expect(result.current[0]).toEqual({ search: 'pay_134', currency: 'USD', page: 1 })
    expect(window.location.search).toBe('?search=pay_134&currency=USD')
    expect(window.history.length).toBe(entries + 1)
  })

  it('should remove the currency param, keeping the Payment ID search, in one history entry when the Currency filter is cleared', () => {
    window.history.replaceState(null, '', '/?search=pay_134&currency=USD')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ currency: '' }))

    expect(result.current[0]).toEqual({ search: 'pay_134', currency: '', page: 1 })
    expect(window.location.search).toBe('?search=pay_134')
    expect(window.history.length).toBe(entries + 1)
  })

  it('should not add a history entry when the Currency filter is already applied', () => {
    window.history.replaceState(null, '', '/?currency=USD')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ currency: 'USD' }))

    expect(window.history.length).toBe(entries)
  })

  it('should clear the Payment ID search and the Currency filter together in one history entry', () => {
    window.history.replaceState(null, '', '/?foo=1&search=pay_134&currency=USD')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ search: '', currency: '' }))

    expect(window.location.search).toBe('?foo=1')
    expect(window.history.length).toBe(entries + 1)
  })

  it('should read the current page from the URL', () => {
    window.history.replaceState(null, '', '/?page=3')

    const { result } = renderHook(() => usePaymentFilters())

    expect(result.current[0].page).toBe(3)
  })

  it.each(['?page=0', '?page=-1', '?page=abc', '?page=1.5', '?page=', ''])(
    'should read page 1 when the URL query is "%s"',
    (query) => {
      window.history.replaceState(null, '', `/${query}`)

      const { result } = renderHook(() => usePaymentFilters())

      expect(result.current[0].page).toBe(1)
    },
  )

  it('should write the page to the URL in one history entry when the page is set', () => {
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[2](2))

    expect(result.current[0].page).toBe(2)
    expect(window.location.search).toBe('?page=2')
    expect(window.history.length).toBe(entries + 1)
  })

  it('should remove the page param when the page is set to 1', () => {
    window.history.replaceState(null, '', '/?page=2')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[2](1))

    expect(window.location.search).toBe('')
    expect(result.current[0].page).toBe(1)
    expect(window.history.length).toBe(entries + 1)
  })

  it('should not add a history entry when the current page is set again', () => {
    window.history.replaceState(null, '', '/?page=2')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[2](2))

    expect(window.history.length).toBe(entries)
  })

  it('should replace the history entry instead of adding one when setPage is called with replace', () => {
    window.history.replaceState(null, '', '/?search=pay_134&page=5')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[2](1, { replace: true }))

    expect(window.location.search).toBe('?search=pay_134')
    expect(result.current[0].page).toBe(1)
    expect(window.history.length).toBe(entries)
  })

  it('should keep the Payment ID search and the Currency filter when the page is set', () => {
    window.history.replaceState(null, '', '/?search=pay_134&currency=USD')
    const { result } = renderHook(() => usePaymentFilters())

    act(() => result.current[2](2))

    expect(window.location.search).toBe('?search=pay_134&currency=USD&page=2')
  })

  it.each([
    ['Payment ID search', { search: 'pay_999' }, { search: 'pay_999', currency: 'USD' }],
    ['Currency filter', { currency: 'EUR' as const }, { search: 'pay_134', currency: 'EUR' }],
    [
      'Payment ID search and Currency filter cleared together',
      { search: '', currency: '' as const },
      { search: '', currency: '' },
    ],
  ])('should apply the new filters and remove the page param when the %s changes', (_name, patch, expected) => {
    window.history.replaceState(null, '', '/?search=pay_134&currency=USD&page=2')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1](patch))

    expect(result.current[0]).toEqual({ ...expected, page: 1 })
    expect(new URLSearchParams(window.location.search).has('page')).toBe(false)
    expect(window.history.length).toBe(entries + 1)
  })

  it('should remove the page param in one history entry when a filters patch changes nothing on a later page', () => {
    window.history.replaceState(null, '', '/?search=pay_134&page=2')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ search: ' pay_134 ' }))

    expect(window.location.search).toBe('?search=pay_134')
    expect(result.current[0].page).toBe(1)
    expect(window.history.length).toBe(entries + 1)
  })

  it.each(['1', 'abc', '0', '-1', '1.5', ''])(
    'should remove the explicit or invalid page param "%s" in one history entry when a filters patch changes nothing',
    (page) => {
      window.history.replaceState(null, '', `/?search=pay_134&page=${page}`)
      const { result } = renderHook(() => usePaymentFilters())
      const entries = window.history.length

      act(() => result.current[1]({ search: 'pay_134' }))

      expect(window.location.search).toBe('?search=pay_134')
      expect(window.history.length).toBe(entries + 1)
    },
  )

  it('should add no history entry when a filters patch changes nothing on page 1', () => {
    window.history.replaceState(null, '', '/?search=pay_134')
    const { result } = renderHook(() => usePaymentFilters())
    const entries = window.history.length

    act(() => result.current[1]({ search: ' pay_134 ' }))

    expect(window.location.search).toBe('?search=pay_134')
    expect(window.history.length).toBe(entries)
  })

  it('should return the previous Payment ID search when the user goes Back', async () => {
    window.history.replaceState(null, '', '/?search=pay_134_1')
    const { result } = renderHook(() => usePaymentFilters())
    act(() => result.current[1]({ search: 'pay_134_2' }))

    act(() => window.history.back())

    await waitFor(() => expect(result.current[0].search).toBe('pay_134_1'))

    await returnToLatestEntry(() => expect(result.current[0].search).toBe('pay_134_2'))
  })

  it('should return the previous page when the user goes Back', async () => {
    const { result } = renderHook(() => usePaymentFilters())
    act(() => result.current[2](2))

    act(() => window.history.back())

    await waitFor(() => expect(result.current[0].page).toBe(1))

    await returnToLatestEntry(() => expect(result.current[0].page).toBe(2))
  })

  it('should keep the same filters object while the URL is unchanged', () => {
    window.history.replaceState(null, '', '/?search=pay_134_1')
    const { result, rerender } = renderHook(() => usePaymentFilters())
    const first = result.current[0]

    rerender()

    expect(result.current[0]).toBe(first)
  })
})
