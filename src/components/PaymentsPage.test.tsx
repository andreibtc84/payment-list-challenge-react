import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { API_URL } from '../constants'
import { I18N } from '../constants/i18n'
import { server } from '../mocks/node'
import type { Payment, PaymentStatus } from '../types/payment'
import { PaymentsPage } from './PaymentsPage'

// Fresh QueryClient per test, not <App />: App's shared client would cache data across tests
// and hide the loading state. Vitest globals are imported because `tsc -b` checks this file.
const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <PaymentsPage />
    </QueryClientProvider>,
  )
}

// Renders the page and waits until the default mock data's first row is on screen.
const renderLoadedPage = async () => {
  renderPage()
  await screen.findByRole('cell', { name: 'pay_134_1' })
}

// Serves one payment (defaults plus the test's overrides), renders the page and waits for
// its row, so each test spells out only the field it checks.
const renderPageWithPayment = async (overrides: Partial<Payment>) => {
  const payment: Payment = {
    id: 'pay_test_1',
    customerName: 'Test Customer',
    amount: 1,
    customerAddress: '1 Test St',
    currency: 'USD',
    status: 'completed',
    date: '2024-04-03T14:05:09Z',
    description: 'Test payment',
    ...overrides,
  }
  server.use(
    http.get(`*${API_URL}`, () =>
      HttpResponse.json({ payments: [payment], total: 1, page: 1, pageSize: 5 }),
    ),
  )
  renderPage()
  await screen.findByRole('cell', { name: payment.id })
}

// Reads a data row as { [column header]: cell element }, so assertions name columns
// the way the README does instead of relying on cell positions.
const getDataCells = (index: number): Record<string, HTMLElement> => {
  const headers = screen
    .getAllByRole('columnheader')
    .map((header) => header.textContent ?? '')
  const cells = within(screen.getAllByRole('row')[index + 1]).getAllByRole(
    'cell',
  )
  return Object.fromEntries(headers.map((header, i) => [header, cells[i]]))
}

// The same row as { [column header]: cell text }.
const getDataRow = (index: number) =>
  Object.fromEntries(
    Object.entries(getDataCells(index)).map(([header, cell]) => [
      header,
      cell.textContent,
    ]),
  )

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})
afterAll(() => server.close())

describe('PaymentsPage payment list', () => {
  // One case per column, so a failure names the column that broke.
  it.each([
    ['Payment ID', 'pay_134_1'],
    ['Amount', '250.00'],
    ['Customer', 'Alice Green'],
    ['Currency', 'USD'],
    ['Status', 'completed'],
  ])("should show the first payment's %s as %s", async (column, expected) => {
    await renderLoadedPage()

    expect(getDataRow(0)[column]).toBe(expected)
  })

  it('should show the date as dd/MM/yyyy, HH:mm:ss inside a time element', async () => {
    // Day 03 / month 04 reads differently if swapped, and 14:05 differs on a 12-hour clock.
    // vitest.config.ts runs tests in UTC, so local time equals the UTC value.
    await renderPageWithPayment({ date: '2024-04-03T14:05:09Z' })

    expect(getDataRow(0).Date).toBe('03/04/2024, 14:05:09')
    // jest-dom matchers are not set up in this repo, so read the attribute directly.
    expect(
      within(getDataCells(0).Date).getByRole('time').getAttribute('datetime'),
    ).toBe('2024-04-03T14:05:09Z')
  })

  it('should show an unparseable date as raw text, without a time element', async () => {
    await renderPageWithPayment({ date: 'not-a-date' })

    expect(getDataRow(0).Date).toBe('not-a-date')
    // A datetime attribute must hold a valid date, so there is no <time> here.
    expect(within(getDataCells(0).Date).queryByRole('time')).toBeNull()
  })

  it('should request the first page of 5 payments and show 5 rows', async () => {
    const requestedUrls: URL[] = []
    server.events.on('request:start', ({ request }) => {
      requestedUrls.push(new URL(request.url))
    })
    await renderLoadedPage()

    expect(screen.getAllByRole('row')).toHaveLength(6) // 1 header + 5 payments
    expect(requestedUrls).toHaveLength(1)
    expect(requestedUrls[0].searchParams.get('page')).toBe('1')
    expect(requestedUrls[0].searchParams.get('pageSize')).toBe('5')
  })

  it('should announce loading to screen readers and hide the skeleton from assistive tech', async () => {
    renderPage()

    // Synchronously after render the query is still pending.
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('Loading payments…')
    expect(screen.queryByRole('table')).toBeNull()

    await screen.findByRole('cell', { name: 'pay_134_1' })

    // Same region stays mounted and is emptied, so later loads can announce again.
    expect(screen.getByRole('status')).toBe(status)
    expect(status.textContent).toBe('')
  })

  it('should show the six column headers as header cells, in the screenshot order', async () => {
    await renderLoadedPage()

    const headers = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    // Both I18N (README) and the screenshot's wording, so a typo in i18n.ts is caught too.
    expect(headers).toEqual([
      I18N.TABLE_HEADER_PAYMENT_ID,
      I18N.TABLE_HEADER_DATE,
      I18N.TABLE_HEADER_AMOUNT,
      I18N.TABLE_HEADER_CUSTOMER,
      I18N.TABLE_HEADER_CURRENCY,
      I18N.TABLE_HEADER_STATUS,
    ])
    expect(headers).toEqual(['Payment ID', 'Date', 'Amount', 'Customer', 'Currency', 'Status'])
  })

  // Every status, so the word (not only the colour) is checked in each badge (WCAG 1.4.1).
  it.each<PaymentStatus>(['completed', 'pending', 'failed', 'refunded'])(
    'should write the status %s as text in its badge',
    async (status) => {
      await renderPageWithPayment({ status })

      expect(getDataRow(0).Status).toBe(status)
    },
  )

  it('should name the table after the page heading', async () => {
    await renderLoadedPage()

    expect(screen.getByRole('table', { name: 'All payments' })).toBeTruthy()
  })

  it('should wrap the table in a keyboard-focusable region named after the heading', async () => {
    await renderLoadedPage()

    const region = screen.getByRole('region', { name: 'All payments' })
    expect(region.tabIndex).toBe(0)
    expect(
      within(region).getByRole('table', { name: 'All payments' }),
    ).toBeTruthy()
  })
})
