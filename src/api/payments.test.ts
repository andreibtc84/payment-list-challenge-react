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
