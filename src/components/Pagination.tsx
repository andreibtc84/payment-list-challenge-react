import { useLayoutEffect, useRef } from 'react'
import { I18N } from '../constants/i18n'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

// Grey border as in the screenshot; disabled:hover stops a disabled button tinting on hover.
const BUTTON_CLASS =
  'border border-gray-300 bg-white text-gray-800 shadow-none hover:bg-gray-100 disabled:hover:bg-white'

export const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => {
  const previousRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const pressedRef = useRef<'previous' | 'next' | null>(null)
  const isFirst = page === 1
  const isLast = page >= totalPages

  // Focus after render, before paint. Only on a page change: the render right after a click
  // still shows the old page while the new one loads.
  useLayoutEffect(() => {
    if (pressedRef.current === 'next' && isLast) previousRef.current?.focus()
    if (pressedRef.current === 'previous' && isFirst) nextRef.current?.focus()
    pressedRef.current = null
  }, [page, isFirst, isLast])

  return (
    <nav
      aria-label={I18N.PAGINATION_LABEL}
      // Equal side columns centre the label; justify-between would shift it (Previous is wider).
      className='grid grid-cols-[1fr_auto_1fr] items-center border-t px-4 py-3'
    >
      <Button
        ref={previousRef}
        type='button'
        className={`${BUTTON_CLASS} justify-self-start`}
        disabled={isFirst}
        onClick={() => {
          pressedRef.current = 'previous'
          onPageChange(page - 1)
        }}
      >
        {I18N.PREVIOUS_BUTTON}
      </Button>
      {/* Atomic, so a screen reader reads the whole "Page N" after a click. */}
      <span aria-live='polite' aria-atomic='true' className='text-center text-gray-800'>
        {I18N.PAGE_LABEL} {page}
      </span>
      <Button
        ref={nextRef}
        type='button'
        className={`${BUTTON_CLASS} justify-self-end`}
        disabled={isLast}
        onClick={() => {
          pressedRef.current = 'next'
          onPageChange(page + 1)
        }}
      >
        {I18N.NEXT_BUTTON}
      </Button>
    </nav>
  )
}
