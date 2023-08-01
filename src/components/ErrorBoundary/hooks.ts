import { useContext } from 'react'
import { useErrorBoundary as useReactErrorBoundary } from 'react-error-boundary'
import { ErrorBoundaryContext, ErrorBoundaryContextType } from './Provider'
import { BaseErrorType, ErrorBoundaryType } from 'constants/types'
import { reportError } from './reportError'

export const useErrorContext = (): ErrorBoundaryContextType => {
  try {
    return useContext(ErrorBoundaryContext)
  } catch {
    return {} as ErrorBoundaryContextType
  }
}

export const useErrorBoundary = (): ErrorBoundaryType => {
  const { showBoundary, resetBoundary } = useReactErrorBoundary()
  const { extras, tags } = useContext(ErrorBoundaryContext)
  const reportErrorWithContext = (error: Error & BaseErrorType) => {
    reportError(error, { extras, tags })
  }

  return { showBoundary, resetBoundary, reportError: reportErrorWithContext }
}
