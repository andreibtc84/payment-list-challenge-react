import { format, isValid, parseISO } from 'date-fns'

// Two decimals and no currency symbol, as in the screenshot.
export const formatAmount = (amount: number): string => amount.toFixed(2)

// `unknown`, because the response isn't validated; parseISO throws on non-strings.
// parseISO, not new Date(), so 2024-02-30 is rejected instead of rolled over.
export const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' && isValid(parseISO(value))

// README format, in the viewer's local time. An unparseable value is shown as-is
// instead of throwing, which would take the whole page down.
export const formatDate = (isoDate: string): string =>
  isValidDate(isoDate) ? format(parseISO(isoDate), 'dd/MM/yyyy, HH:mm:ss') : isoDate
