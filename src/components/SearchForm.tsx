import { useRef, useState, type FormEvent } from 'react'
import { CURRENCIES, isCurrency, type CurrencyFilter } from '../constants'
import { I18N } from '../constants/i18n'
import { Button } from '@/components/ui/button'
import { fieldClassName, Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const INPUT_ID = 'payment-search'
const CURRENCY_ID = 'payment-currency'

interface SearchFormProps {
  term: string
  currency: CurrencyFilter
  onSearch: (term: string) => void
  onCurrencyChange: (currency: CurrencyFilter) => void
  onClear?: () => void
}

export const SearchForm = ({
  term,
  currency,
  onSearch,
  onCurrencyChange,
  onClear,
}: SearchFormProps) => {
  const [draft, setDraft] = useState(term)
  const [appliedTerm, setAppliedTerm] = useState(term)
  const inputRef = useRef<HTMLInputElement>(null)

  // Back/Forward change the URL term, so the box follows it. Adjusting state during render keeps
  // focus (a key remount would lose it) and avoids an effect's extra render with a stale draft.
  if (term !== appliedTerm) {
    setAppliedTerm(term)
    setDraft(term)
  }

  const isEmpty = draft.trim() === ''

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Empty submits do nothing; aria-disabled (not disabled) keeps the button focusable and announced.
    if (isEmpty) return
    onSearch(draft)
  }

  const handleClear = () => {
    onClear?.()
    // The button disappears after clearing, so focus moves to the input instead of being lost.
    inputRef.current?.focus()
  }

  return (
    <form
      role='search'
      onSubmit={handleSubmit}
      className='mb-6 flex flex-col items-start gap-4 sm:flex-row'
    >
      {/* The placeholder alone isn't a reliable accessible name, so a hidden label names the box. */}
      <label htmlFor={INPUT_ID} className='sr-only'>
        {I18N.SEARCH_LABEL}
      </label>
      <Input
        ref={inputRef}
        id={INPUT_ID}
        type='search'
        // Half the content width from sm up, like the screenshot; stacked full width on phones.
        // No native ×: it only empties the box, while Clear Filters also clears the applied search.
        className='sm:w-1/2 [&::-webkit-search-cancel-button]:appearance-none'
        placeholder={I18N.SEARCH_PLACEHOLDER}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      {/* No visible label, as in the screenshot; the hidden label names it for assistive tech. */}
      <label htmlFor={CURRENCY_ID} className='sr-only'>
        {I18N.CURRENCY_FILTER_LABEL}
      </label>
      {/* Controlled from the URL, so Back/Forward update it; a choice applies at once (no draft). */}
      {/* Screenshot's width from sm up; full width on phones. */}
      <div className='relative w-full sm:w-32'>
        <select
          id={CURRENCY_ID}
          // Native arrow off: its inset differs per browser. pr-8 clears our chevron.
          className={cn(fieldClassName, 'appearance-none pr-8')}
          value={currency}
          onChange={(event) => {
            const { value } = event.target
            onCurrencyChange(isCurrency(value) ? value : '')
          }}
        >
          <option value=''>{I18N.CURRENCIES_OPTION}</option>
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        {/* currentColor keeps it visible in forced colours. */}
        <svg
          aria-hidden='true'
          viewBox='0 0 16 16'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2'
        >
          <path d='m4 6 4 4 4-4' />
        </svg>
      </div>
      <Button type='submit' aria-disabled={isEmpty || undefined} className='shrink-0'>
        {I18N.SEARCH_BUTTON}
      </Button>
      {onClear && (
        <Button
          type='button'
          onClick={handleClear}
          className='shrink-0 bg-gray-500 hover:bg-gray-600'
        >
          {I18N.CLEAR_FILTERS}
        </Button>
      )}
    </form>
  )
}
