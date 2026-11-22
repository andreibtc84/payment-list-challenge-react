import { useState, type FormEvent } from 'react'
import { I18N } from '../constants/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const INPUT_ID = 'payment-search'

interface SearchFormProps {
  term: string
  onSearch: (term: string) => void
}

export const SearchForm = ({ term, onSearch }: SearchFormProps) => {
  const [draft, setDraft] = useState(term)
  const [appliedTerm, setAppliedTerm] = useState(term)

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
        id={INPUT_ID}
        type='search'
        // Half the content width from sm up, like the screenshot; stacked full width on phones.
        className='sm:w-1/2'
        placeholder={I18N.SEARCH_PLACEHOLDER}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <Button type='submit' aria-disabled={isEmpty || undefined} className='shrink-0'>
        {I18N.SEARCH_BUTTON}
      </Button>
    </form>
  )
}
