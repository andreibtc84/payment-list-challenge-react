import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { I18N } from '../constants/i18n'
import { getErrorMessage } from './payments'

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
  it('should return the payment not found message for a 404 response', () => {
    expect(getErrorMessage(httpError(404))).toBe(I18N.PAYMENT_NOT_FOUND)
  })

  // Only 404 has a message in Step 4; everything else stays unmapped.
  it.each([
    ['a 500 response', httpError(500)],
    ['a 401 response', httpError(401)],
    ['a network error (no response)', new AxiosError('Network Error', AxiosError.ERR_NETWORK)],
    ['a non-axios error', new Error('boom')],
    ['no error', null],
  ])('should return no message for %s', (_case, error) => {
    expect(getErrorMessage(error)).toBeUndefined()
  })
})
