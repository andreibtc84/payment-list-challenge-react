import { Component, type ErrorInfo, type ReactNode } from 'react'
import { I18N } from '../constants/i18n'
import { trackError } from '../lib/telemetry'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// A class: React has no hook for catching render errors. Reload is the recovery.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackError('ui_render_failed', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    // role="alert" announces it without moving focus.
    return (
      <p
        role='alert'
        className='m-4 rounded-md border border-red-200 bg-red-100 p-4 text-red-700 sm:mx-0 sm:w-1/2'
      >
        {I18N.SOMETHING_WENT_WRONG}
      </p>
    )
  }
}
