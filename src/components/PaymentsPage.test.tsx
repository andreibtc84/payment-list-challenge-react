import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { API_URL } from '../constants'
import { I18N } from '../constants/i18n'
import { mockPayments134 } from '../mocks/mockPaymentsData'
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

type User = ReturnType<typeof userEvent.setup>

// The two ways to submit a search; shared so every submit test covers both the same way.
const SUBMIT_WAYS: [string, (user: User) => Promise<void>][] = [
  [
    'clicking Search',
    (user) => user.click(getSearchButton()),
  ],
  ['pressing Enter', (user) => user.keyboard('{Enter}')],
]

const getSearchbox = () =>
  screen.getByRole<HTMLInputElement>('searchbox', { name: 'Search payments' })

const getSearchButton = () => screen.getByRole('button', { name: 'Search' })

// Collects the URL of every payments request from now on (listeners are removed in afterEach).
const captureRequests = () => {
  const urls: URL[] = []
  server.events.on('request:start', ({ request }) => {
    urls.push(new URL(request.url))
  })
  return urls
}

// Header row + one Payment: the state after a search for one Payment ID has loaded.
const waitForSingleResult = () =>
  waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))

// Waits for the unfiltered first page: 1 header row + 5 payments.
const waitForFirstPage = () =>
  waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(6))

// Single release path for the held response; afterEach calls it too, so a test that fails
// before releasing leaves no pending response.
let releaseHeldSearch = () => {}

// Holds the response of the next payments request until releaseHeldSearch() is called.
const holdNextSearch = () => {
  const gate = new Promise<void>((resolve) => {
    releaseHeldSearch = resolve
  })
  server.use(
    http.get(
      `*${API_URL}`,
      async () => {
        await gate
        return HttpResponse.json({
          payments: [mockPayments134[0]],
          total: 1,
          page: 1,
          pageSize: 5,
        })
      },
      { once: true },
    ),
  )
}

beforeAll(() => server.listen())
afterEach(() => {
  releaseHeldSearch()
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
    expect(within(getDataCells(0).Date).queryByRole('time')).not.toBeInTheDocument()
  })

  it('should request the first page of 5 payments and show 5 rows', async () => {
    const requestedUrls = captureRequests()
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
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

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

    expect(screen.getByRole('table', { name: 'All payments' })).toBeInTheDocument()
  })

  it('should wrap the table in a keyboard-focusable region named after the heading', async () => {
    await renderLoadedPage()

    const region = screen.getByRole('region', { name: 'All payments' })
    expect(region.tabIndex).toBe(0)
    expect(
      within(region).getByRole('table', { name: 'All payments' }),
    ).toBeInTheDocument()
  })
})

describe('PaymentsPage search', () => {
  it('should show a searchbox for the Payment ID inside a search landmark', async () => {
    await renderLoadedPage()

    const searchbox = within(screen.getByRole('search')).getByRole('searchbox', {
      name: 'Search payments',
    })
    expect(searchbox.getAttribute('placeholder')).toBe('Enter payment ID')
  })

  it('should show a Search button inside the search landmark', async () => {
    await renderLoadedPage()

    expect(
      within(screen.getByRole('search')).getByRole('button', { name: 'Search' }),
    ).toBeInTheDocument()
  })

  it.each(SUBMIT_WAYS)(
    'should send the Payment ID search with page 1 and page size 5 and show only that Payment when %s',
    async (_how, submit) => {
      const user = userEvent.setup()
      const requestedUrls = captureRequests()
      await renderLoadedPage()
      requestedUrls.length = 0

      await user.type(getSearchbox(), 'pay_134_1')
      await submit(user)

      // Waits for the filtered result: 1 header + 1 payment.
      await waitForSingleResult()
      expect(getDataRow(0)['Payment ID']).toBe('pay_134_1')
      expect(requestedUrls).toHaveLength(1)
      expect(requestedUrls[0].searchParams.get('search')).toBe('pay_134_1')
      expect(requestedUrls[0].searchParams.get('page')).toBe('1')
      expect(requestedUrls[0].searchParams.get('pageSize')).toBe('5')
    },
  )

  it('should keep the term in the input after searching', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    const searchbox = getSearchbox()

    await user.type(searchbox, 'pay_134_1')
    await user.click(getSearchButton())
    await waitForSingleResult()

    expect(searchbox.value).toBe('pay_134_1')
  })

  it('should put the search in the URL after searching', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()

    await user.type(getSearchbox(), 'pay_134_1')
    await user.click(getSearchButton())
    // Waits for the filtered result, so no request is still in flight when the test ends.
    await waitForSingleResult()

    expect(window.location.search).toBe('?search=pay_134_1')
  })

  it('should keep the current rows on screen while a search loads', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    holdNextSearch()

    await user.type(getSearchbox(), 'pay_134_1')
    await user.click(getSearchButton())

    // The search request is held, so this is the in-between state.
    expect(screen.getAllByRole('row')).toHaveLength(6) // 1 header + 5 original payments
    releaseHeldSearch()
    await waitForSingleResult()
  })

  it('should mark the table busy and announce loading while a search loads', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    const status = screen.getByRole('status')
    holdNextSearch()

    await user.type(getSearchbox(), 'pay_134_1')
    await user.click(getSearchButton())

    expect(status.textContent).toBe('Loading payments…')
    expect(
      screen.getByRole('table', { name: 'All payments' }).getAttribute('aria-busy'),
    ).toBe('true')

    releaseHeldSearch()
    await waitFor(() => expect(status.textContent).toBe(''))
    expect(
      screen.getByRole('table', { name: 'All payments' }).getAttribute('aria-busy'),
    ).not.toBeInTheDocument()
  })

  it('should trim the term before sending the Payment ID search', async () => {
    const user = userEvent.setup()
    const requestedUrls = captureRequests()
    await renderLoadedPage()
    requestedUrls.length = 0

    await user.type(getSearchbox(), '  pay_134_1  ')
    await user.click(getSearchButton())
    await waitForSingleResult()

    expect(requestedUrls).toHaveLength(1)
    expect(requestedUrls[0].searchParams.get('search')).toBe('pay_134_1')
  })

  it.each(['', '   '])(
    'should mark Search aria-disabled and send no request when the input is %j',
    async (typed) => {
      const user = userEvent.setup()
      const requestedUrls = captureRequests()
      await renderLoadedPage()
      requestedUrls.length = 0
      const historyLength = window.history.length

      if (typed) await user.type(getSearchbox(), typed)
      const button = getSearchButton()
      await user.click(button)
      await user.type(getSearchbox(), '{Enter}')

      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(requestedUrls).toHaveLength(0)
      expect(window.history.length).toBe(historyLength)
    },
  )

  it('should let keyboard users Tab to the Search button while it is aria-disabled', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()

    await user.click(getSearchbox())
    await user.tab()

    // Natively disabled buttons drop out of the Tab order; aria-disabled must not.
    const button = getSearchButton()
    expect(document.activeElement).toBe(button)
    expect(button.getAttribute('aria-disabled')).toBe('true')
  })

  it.each(['?search=pay_134_1', '?search=%20pay_134_1%20'])(
    'should load with the search applied in the input and the table when the URL starts with %s',
    async (query) => {
      const requestedUrls = captureRequests()
      window.history.replaceState(null, '', `/${query}`)

      renderPage()

      await screen.findByRole('cell', { name: 'pay_134_1' })
      expect(screen.getAllByRole('row')).toHaveLength(2)
      expect(getSearchbox().value).toBe('pay_134_1')
      expect(requestedUrls).toHaveLength(1)
      expect(requestedUrls[0].searchParams.get('search')).toBe('pay_134_1')
    },
  )

  it('should go back to all payments on Back after a search and return to the search on Forward', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    await user.type(getSearchbox(), 'pay_134_1')
    await user.click(getSearchButton())
    await waitForSingleResult()

    act(() => window.history.back())

    // popstate is async in jsdom, and the previous rows can linger until the list reloads.
    await waitForFirstPage()
    expect(getSearchbox().value).toBe('')

    act(() => window.history.forward())

    await waitForSingleResult()
    expect(getDataRow(0)['Payment ID']).toBe('pay_134_1')
    expect(getSearchbox().value).toBe('pay_134_1')
  })

  it.each<[string, (user: User) => Promise<void>, () => HTMLElement]>([
    [
      'the Search button after clicking it',
      (user) => user.click(getSearchButton()),
      () => getSearchButton(),
    ],
    [
      'the searchbox after pressing Enter',
      (user) => user.keyboard('{Enter}'),
      getSearchbox,
    ],
  ])('should keep focus on %s', async (_how, submit, getControl) => {
    const user = userEvent.setup()
    await renderLoadedPage()
    await user.type(getSearchbox(), 'pay_134_1')

    await submit(user)
    await waitForSingleResult()

    expect(document.activeElement).toBe(getControl())
  })

  it('should not add a history entry when searching the applied term again', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    await user.type(getSearchbox(), 'pay_134_1')
    await user.click(getSearchButton())
    await waitForSingleResult()
    const historyLength = window.history.length

    await user.click(getSearchButton())

    expect(window.history.length).toBe(historyLength)
    expect(window.location.search).toBe('?search=pay_134_1')
  })

  it.each(SUBMIT_WAYS)(
    'should keep the applied search when the box is cleared and submitted by %s',
    async (_how, submit) => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '/?search=pay_134_1')
      renderPage()
      await screen.findByRole('cell', { name: 'pay_134_1' })
      const historyLength = window.history.length

      await user.clear(getSearchbox())
      await submit(user)

      expect(window.location.search).toBe('?search=pay_134_1')
      expect(window.history.length).toBe(historyLength)
      expect(screen.getAllByRole('row')).toHaveLength(2)
      expect(getDataRow(0)['Payment ID']).toBe('pay_134_1')
    },
  )
})

describe('PaymentsPage clear filters', () => {
  const queryClearButton = () =>
    screen.queryByRole('button', { name: I18N.CLEAR_FILTERS })
  const getClearButton = () =>
    screen.getByRole('button', { name: I18N.CLEAR_FILTERS })
  // Applies the pay_134_1 search, so the Clear Filters button shows.
  const applySearch = async (user: User) => {
    await user.type(getSearchbox(), 'pay_134_1')
    await user.click(getSearchButton())
    await waitForSingleResult()
  }
  // Opens the page with the search already in the URL and waits for its single result.
  const renderWithSearchInUrl = async (url = '/?search=pay_134_1') => {
    window.history.replaceState(null, '', url)
    renderPage()
    await waitForSingleResult()
  }

  it('should not show a Clear Filters button when no filter is applied', async () => {
    await renderLoadedPage()

    expect(queryClearButton()).not.toBeInTheDocument()
  })

  it('should show a Clear Filters button inside the search landmark after a search', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()

    await applySearch(user)

    expect(
      within(screen.getByRole('search')).getByRole('button', {
        name: I18N.CLEAR_FILTERS,
      }),
    ).toBeInTheDocument()
  })

  it('should show the Clear Filters button when the page loads with a search in the URL', async () => {
    await renderWithSearchInUrl()

    expect(getClearButton()).toBeInTheDocument()
  })

  it('should not show the Clear Filters button while unsearched text is typed', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()

    await user.type(getSearchbox(), 'pay_134_1')

    expect(queryClearButton()).not.toBeInTheDocument()
  })

  it('should empty the search input and show the first 5 Payments when Clear Filters is clicked', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    await applySearch(user)

    await user.click(getClearButton())

    expect(getSearchbox().value).toBe('')
    await waitForFirstPage()
  })

  it('should discard unsearched edits in the input when Clear Filters is clicked', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    await applySearch(user)
    await user.type(getSearchbox(), '_edited')

    await user.click(getClearButton())

    expect(getSearchbox().value).toBe('')
    await waitForFirstPage()
  })

  it('should remove the search from the URL, keeping the path and other params, when Clear Filters is clicked', async () => {
    const user = userEvent.setup()
    await renderWithSearchInUrl('/base/?search=pay_134_1&view=compact')

    await user.click(getClearButton())

    expect(window.location.pathname).toBe('/base/')
    expect(window.location.search).toBe('?view=compact')
    // Waits for the unfiltered list, so no request is still in flight when the test ends.
    await waitForFirstPage()
  })

  it('should hide the Clear Filters button after clearing', async () => {
    const user = userEvent.setup()
    await renderWithSearchInUrl()

    await user.click(getClearButton())

    expect(queryClearButton()).not.toBeInTheDocument()
    await waitForFirstPage()
  })

  it('should restore the search on Back after clearing and clear it again on Forward', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    await applySearch(user)
    await user.click(getClearButton())
    await waitForFirstPage()

    act(() => window.history.back())

    // popstate is async in jsdom, so wait for the search to come back.
    await waitForSingleResult()
    expect(getSearchbox().value).toBe('pay_134_1')
    expect(getDataRow(0)['Payment ID']).toBe('pay_134_1')
    expect(getClearButton()).toBeInTheDocument()

    act(() => window.history.forward())

    await waitForFirstPage()
    expect(getSearchbox().value).toBe('')
    expect(queryClearButton()).not.toBeInTheDocument()
  })

  it('should move focus to the search input after clearing', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    await applySearch(user)

    await user.click(getClearButton())

    // Focus must survive both the button unmounting and the full list reloading.
    expect(queryClearButton()).not.toBeInTheDocument()
    await waitForFirstPage()
    expect(document.activeElement).toBe(getSearchbox())
  })

  it('should still search, not clear, when Enter is pressed in the input while Clear Filters is shown', async () => {
    const user = userEvent.setup()
    await renderLoadedPage()
    await applySearch(user)

    await user.clear(getSearchbox())
    await user.type(getSearchbox(), 'pay_134_2{Enter}')

    await waitFor(() =>
      expect(window.location.search).toBe('?search=pay_134_2'),
    )
    await screen.findByRole('cell', { name: 'pay_134_2' })
    expect(getDataRow(0)['Payment ID']).toBe('pay_134_2')
    expect(getClearButton()).toBeInTheDocument()
  })

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('should clear with the keyboard using %s', async (_name, key) => {
    const user = userEvent.setup()
    await renderLoadedPage()
    await applySearch(user)

    await user.tab()
    expect(document.activeElement).toBe(getClearButton())
    await user.keyboard(key)

    expect(getSearchbox().value).toBe('')
    expect(window.location.search).toBe('')
    expect(document.activeElement).toBe(getSearchbox())
    await waitForFirstPage()
  })
})
