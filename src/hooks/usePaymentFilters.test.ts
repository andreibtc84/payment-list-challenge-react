import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePaymentFilters } from './usePaymentFilters'

describe('usePaymentFilters', () => {
  it('should return an empty Payment ID search when the URL has no search param', () => {
    const { result } = renderHook(() => usePaymentFilters())

    expect(result.current[0]).toEqual({ search: '' })
  })

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

  it('should return the previous Payment ID search when the user goes Back', async () => {
    window.history.replaceState(null, '', '/?search=pay_134_1')
    const { result } = renderHook(() => usePaymentFilters())
    act(() => result.current[1]({ search: 'pay_134_2' }))

    act(() => window.history.back())

    await waitFor(() => expect(result.current[0].search).toBe('pay_134_1'))
  })

  it('should keep the same filters object while the URL is unchanged', () => {
    window.history.replaceState(null, '', '/?search=pay_134_1')
    const { result, rerender } = renderHook(() => usePaymentFilters())
    const first = result.current[0]

    rerender()

    expect(result.current[0]).toBe(first)
  })
})
