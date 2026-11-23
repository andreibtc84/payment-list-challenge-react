import { getErrorMessage } from '../api/payments'
import { DEFAULT_PAGE, PAGE_SIZE } from '../constants'
import { I18N } from '../constants/i18n'
import { usePaymentFilters } from '../hooks/usePaymentFilters'
import { usePayments } from '../hooks/usePayments'
import { SearchForm } from './SearchForm'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatAmount, formatDate, isValidDate } from '@/lib/format'

const COLUMN_HEADERS = [
  I18N.TABLE_HEADER_PAYMENT_ID,
  I18N.TABLE_HEADER_DATE,
  I18N.TABLE_HEADER_AMOUNT,
  I18N.TABLE_HEADER_CUSTOMER,
  I18N.TABLE_HEADER_CURRENCY,
  I18N.TABLE_HEADER_STATUS,
]

// The visible h2 names the table (aria-labelledby). A static id is safe: the page renders once.
const HEADING_ID = 'payments-heading'

// Shared by skeleton and real rows, so both keep the same spacing.
const CELL_CLASS = 'px-4 py-4'
const TEXT_CELL_CLASS = `${CELL_CLASS} text-muted-foreground`
// No dividers between body rows, as in the screenshot.
const BODY_ROW_CLASS = 'border-0'

// Shared by the skeleton and the real table, so their columns can't drift apart.
const PaymentsTableHeader = () => (
  <TableHeader className='bg-muted'>
    {/* No hover tint on the header, as in the screenshot. */}
    <TableRow className='hover:bg-transparent'>
      {COLUMN_HEADERS.map((header) => (
        // Darker than shadcn's default, to match the screenshot.
        <TableHead key={header} className='px-4 text-gray-800'>
          {header}
        </TableHead>
      ))}
    </TableRow>
  </TableHeader>
)

export const PaymentsPage = () => {
  const [filters, setFilters] = usePaymentFilters()
  const hasAppliedFilters = filters.search !== '' || filters.currency !== ''
  // Each empty filter sends no param, so the query key matches the unfiltered list.
  const { data, error, isPending, isPlaceholderData } = usePayments({
    page: DEFAULT_PAGE,
    pageSize: PAGE_SIZE,
    ...(filters.search && { search: filters.search }),
    ...(filters.currency && { currency: filters.currency }),
  })
  const errorMessage = getErrorMessage(error)

  return (
    <div className='px-4 py-8 sm:px-0'>
      <h2 id={HEADING_ID} className='mb-6 text-2xl font-semibold text-gray-800'>
        {I18N.PAGE_TITLE}
      </h2>
      <SearchForm
        term={filters.search}
        currency={filters.currency}
        onSearch={(search) => setFilters({ search })}
        onCurrencyChange={(currency) => setFilters({ currency })}
        // One call clears both, so Clear Filters is a single Back step.
        onClear={
          hasAppliedFilters ? () => setFilters({ search: '', currency: '' }) : undefined
        }
      />
      {/* Always rendered: a live region must exist before its text changes to be announced.
          One region for loading and any error message; they never show at the same time. */}
      <div role='status' aria-live='polite'>
        {/* Not isFetching: that would also announce silent background refetches. */}
        <span className='sr-only'>
          {isPending || isPlaceholderData ? I18N.LOADING_PAYMENTS : ''}
        </span>
        {errorMessage && (
          // Same width as the search input (sm:w-1/2 in SearchForm), so the box lines up with it.
          <p className='flex items-start gap-2 rounded-md border border-red-200 bg-red-100 p-4 text-red-700 sm:w-1/2'>
            {/* Decorative: the text carries the meaning; the icon is a cue beyond colour. */}
            <svg
              aria-hidden='true'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              strokeLinecap='round'
              className='mt-0.5 size-5 shrink-0'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M12 8v4M12 16h.01' />
            </svg>
            {errorMessage}
          </p>
        )}
      </div>
      {/* The message replaces the table, as in the screenshot; no empty headers under it. */}
      {!errorMessage && (
        <div className='rounded-lg border bg-white'>
          {isPending ? (
            // Hidden from screen readers, which get the status above; no pulse with reduced motion.
            <Table aria-hidden='true'>
              <PaymentsTableHeader />
              <TableBody>
                {Array.from({ length: PAGE_SIZE }, (_, rowIndex) => (
                  <TableRow key={rowIndex} className={BODY_ROW_CLASS}>
                    {COLUMN_HEADERS.map((header) => (
                      <TableCell key={header} className={CELL_CLASS}>
                        <Skeleton className='h-4 w-full motion-reduce:animate-none' />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            // Focusable, named scroll region, so keyboard users can scroll the table on narrow screens.
            // Previous rows stay while a search loads: dimmed and busy so they read as stale.
            <Table
              aria-labelledby={HEADING_ID}
              aria-busy={isPlaceholderData || undefined}
              className={
                isPlaceholderData
                  ? 'opacity-90 transition-opacity motion-reduce:transition-none'
                  : undefined
              }
              containerProps={{
                role: 'region',
                'aria-labelledby': HEADING_ID,
                tabIndex: 0,
                className:
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900',
              }}
            >
              <PaymentsTableHeader />
              <TableBody>
                {data?.payments.map((payment) => (
                  <TableRow key={payment.id} className={BODY_ROW_CLASS}>
                    <TableCell className={TEXT_CELL_CLASS}>{payment.id}</TableCell>
                    {/* <time> keeps the exact UTC value; an invalid datetime attribute would be invalid HTML. */}
                    <TableCell className={TEXT_CELL_CLASS}>
                      {isValidDate(payment.date) ? (
                        <time dateTime={payment.date}>
                          {formatDate(payment.date)}
                        </time>
                      ) : (
                        payment.date
                      )}
                    </TableCell>
                    <TableCell className={TEXT_CELL_CLASS}>
                      {formatAmount(payment.amount)}
                    </TableCell>
                    <TableCell className={TEXT_CELL_CLASS}>
                      {payment.customerName}
                    </TableCell>
                    <TableCell className={TEXT_CELL_CLASS}>
                      {payment.currency}
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      <Badge variant={payment.status}>{payment.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}
