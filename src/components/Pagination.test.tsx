import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18N } from '../constants/i18n'
import { Pagination } from './Pagination'

const TOTAL_PAGES = 5

const renderPagination = (page: number, totalPages = TOTAL_PAGES) => {
  const onPageChange = vi.fn()
  render(<Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />)
  return onPageChange
}

// Holds the page in state, so a click re-renders like the real app.
const StatefulPagination = ({ initialPage, totalPages }: { initialPage: number; totalPages: number }) => {
  const [page, setPage] = useState(initialPage)
  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
}

const getPrevious = () => screen.getByRole('button', { name: I18N.PREVIOUS_BUTTON })
const getNext = () => screen.getByRole('button', { name: I18N.NEXT_BUTTON })

describe('Pagination', () => {
  it.each([1, 3])('should show "Page %i"', (page) => {
    renderPagination(page)

    expect(screen.getByText(`${I18N.PAGE_LABEL} ${page}`)).toBeInTheDocument()
  })

  it('should name the navigation landmark "Pagination"', () => {
    renderPagination(1)

    expect(
      screen.getByRole('navigation', { name: I18N.PAGINATION_LABEL }),
    ).toBeInTheDocument()
  })

  it.each([
    [true, 1],
    [false, 2],
  ])('should set Previous disabled=%s on page %i', (disabled, page) => {
    renderPagination(page)

    expect(getPrevious()).toHaveProperty('disabled', disabled)
  })

  it.each([
    ['Next', getNext, 3],
    ['Previous', getPrevious, 1],
  ])('should call onPageChange from page 2 with %s', async (_name, getButton, expected) => {
    const user = userEvent.setup()
    const onPageChange = renderPagination(2)

    await user.click(getButton())

    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(expected)
  })

  it('should announce the page label politely and as a whole', () => {
    renderPagination(2)

    const label = screen.getByText(`${I18N.PAGE_LABEL} 2`)
    expect(label).toHaveAttribute('aria-live', 'polite')
    expect(label).toHaveAttribute('aria-atomic', 'true')
  })

  it.each([
    [true, 5, 5],
    [false, 4, 5],
  ])('should set Next disabled=%s on page %i of %i', (disabled, page, totalPages) => {
    renderPagination(page, totalPages)

    expect(getNext()).toHaveProperty('disabled', disabled)
  })

  it('should disable both buttons when there is only one page', () => {
    renderPagination(1, 1)

    expect(getPrevious()).toBeDisabled()
    expect(getNext()).toBeDisabled()
  })

  it.each([
    ['Next reaches the last page', 1, 2, getNext, getPrevious],
    ['Previous reaches page 1', 2, 3, getPrevious, getNext],
  ])(
    'should move focus to the other button when %s',
    async (_name, initialPage, totalPages, getPressed, getOther) => {
      const user = userEvent.setup()
      render(<StatefulPagination initialPage={initialPage} totalPages={totalPages} />)

      await user.click(getPressed())

      expect(getPressed()).toBeDisabled()
      expect(getOther()).toHaveFocus()
    },
  )

  it('should keep focus on Next when Next does not reach the last page', async () => {
    const user = userEvent.setup()
    render(<StatefulPagination initialPage={1} totalPages={3} />)

    await user.click(getNext())

    expect(getNext()).toHaveFocus()
  })
})
