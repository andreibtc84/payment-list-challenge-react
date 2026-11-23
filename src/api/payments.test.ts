import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { API_URL } from '../constants'
import { I18N } from '../constants/i18n'
import { setTelemetrySink } from '../lib/telemetry'
import { server } from '../mocks/node'
import { fetchPayments, getErrorMessage, type PaymentQueryParams } from './payments'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Built with axios's own class, so the helper sees the same shape a real request rejects with.
const httpError = (status: number) =>
  new AxiosError('Request failed', AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  } satisfies AxiosResponse)

describe('getErrorMessage', () => {
  it.each([
    [I18N.PAYMENT_NOT_FOUND, 'a 404 response', httpError(404)],
    [I18N.INTERNAL_SERVER_ERROR, 'a 500 response', httpError(500)],
    [I18N.SOMETHING_WENT_WRONG, 'a 401 response', httpError(401)],
    [
      I18N.SOMETHING_WENT_WRONG,
      'a network error (no response)',
      new AxiosError('Network Error', AxiosError.ERR_NETWORK),
    ],
    [I18N.SOMETHING_WENT_WRONG, 'a non-axios error', new Error('boom')],
  ])('should return %j for %s', (expected, _case, error) => {
    expect(getErrorMessage(error)).toBe(expected)
  })

  it('should return no message when there is no error', () => {
    expect(getErrorMessage(null)).toBeUndefined()
  })
})

describe('fetchPayments telemetry', () => {
  const FIRST_PAGE = { page: 1, pageSize: 5 }

  // Expected values: the README's test IDs and axios's fixed error text.
  it.each<[string, PaymentQueryParams, Record<string, unknown>]>([
    [
      'a 200 response',
      FIRST_PAGE,
      {
        event: 'payments_fetch_succeeded',
        level: 'info',
        outcome: 'success',
        statusClass: '2xx',
        status: 200,
        resultCount: 5,
        hasSearch: false,
        currency: '',
      },
    ],
    [
      'a 404 response',
      { ...FIRST_PAGE, search: 'pay_404' },
      {
        event: 'payments_fetch_failed',
        level: 'warn',
        outcome: 'http_error',
        statusClass: '4xx',
        status: 404,
        hasSearch: true,
        message: 'Request failed with status code 404',
      },
    ],
    [
      'a 500 response',
      { ...FIRST_PAGE, search: 'pay_500', currency: 'USD' },
      {
        event: 'payments_fetch_failed',
        level: 'error',
        outcome: 'http_error',
        statusClass: '5xx',
        status: 500,
        hasSearch: true,
        currency: 'USD',
        message: 'Request failed with status code 500',
      },
    ],
  ])('should emit one event for %s', async (_case, params, expected) => {
    const sink = vi.fn()
    setTelemetrySink(sink)

    await fetchPayments(params).catch(() => {})

    expect(sink).toHaveBeenCalledOnce()
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        ...FIRST_PAGE,
        ...expected,
        durationMs: expect.any(Number),
      }),
    )
  })

  it('should emit a network_error event when there is no response', async () => {
    server.use(http.get(`*${API_URL}`, () => HttpResponse.error()))
    const sink = vi.fn()
    setTelemetrySink(sink)

    await expect(fetchPayments(FIRST_PAGE)).rejects.toThrow()

    expect(sink).toHaveBeenCalledOnce()
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'payments_fetch_failed',
        level: 'error',
        outcome: 'network_error',
        statusClass: 'network',
        status: 'network',
        message: 'Network Error',
      }),
    )
  })

  it('should log a search of only spaces as no search, as the search event does', async () => {
    const sink = vi.fn()
    setTelemetrySink(sink)

    // The mock API answers a blank search with 404; only the event matters here.
    await fetchPayments({ ...FIRST_PAGE, search: '   ' }).catch(() => {})

    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ hasSearch: false }))
  })

  it('should still reject a failed request, so the page shows its error message', async () => {
    await expect(
      fetchPayments({ ...FIRST_PAGE, search: 'pay_404' }),
    ).rejects.toThrow('Request failed with status code 404')
  })
})
