import { ReactNode } from 'react'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { BaseError } from '../../errors-types/BaseError'
import { BaseErrorType, Extras, OnErrorType, Tags } from '../../constants/types'
import { useErrorContext } from './hooks'
import { ErrorBoundaryProvider } from './Provider'
import { reportError } from './reportError'
import { Styles as S } from './styles'

export type ErrorBoundaryProps = {
  children?: ReactNode
  fallback?: (
    error: Error & BaseErrorType,
    resetErrorBoundary: () => void
  ) => ReactNode
  onError?: OnErrorType
  extras?: Extras
  tags?: Tags
}

export type FallbackRenderProps = {
  error: Error & BaseErrorType
  resetErrorBoundary: () => void
}

export const ErrorBoundary = ({
  children,
  onError,
  fallback,
  tags = {},
  extras = {},
}: ErrorBoundaryProps) => {
  const context = useErrorContext()

  return (
    <ErrorBoundaryProvider
      tags={tags}
      extras={extras}
      fallback={fallback || context.fallback || undefined}
    >
      <ReactErrorBoundary
        onError={(error, info) =>
          reportError({ error, info, extras, tags, onError }, context)
        }
        fallbackRender={({
          error,
          resetErrorBoundary,
        }: FallbackRenderProps) => {
          if (error instanceof BaseError && error.fallback) {
            return <>{error.fallback(resetErrorBoundary)}</>
          }

          if (fallback) {
            return <>{fallback(error, resetErrorBoundary)}</>
          }

          if (context.fallback) {
            return <>{context.fallback(error, resetErrorBoundary)}</>
          }

          return (
            <div style={S.Background}>
              <div style={S.Container}>
                <div style={S.Message} data-testid="error-handling-message">
                  {error instanceof BaseError && error.displayMessage ? (
                    <>{error.displayMessage}</>
                  ) : (
                    <>{error.message}</>
                  )}
                </div>
              </div>
            </div>
          )
        }}
      >
        <>{children}</>
      </ReactErrorBoundary>
    </ErrorBoundaryProvider>
  )
}
