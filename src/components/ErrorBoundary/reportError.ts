import * as Sentry from '@sentry/react'
import { BaseError } from '../../errors-types/BaseError'
import { ErrorBoundaryContextType } from './Provider'
import { combine } from '../../utils/combine'
import { ReportErrorType } from 'constants/types'

export const reportError = (
  reportedError: ReportErrorType,
  options: ErrorBoundaryContextType = {
    extras: {},
    tags: {},
  }
) => {
  const {
    error,
    extras = {},
    tags = {},
    onError = undefined,
    info = undefined,
  } = reportedError instanceof Error || reportedError instanceof BaseError
    ? { error: reportedError }
    : reportedError

  let allExtras = combine(options.extras, extras)
  let allTags = combine(options.tags, tags)

  Sentry.withScope((scope) => {
    if (error instanceof BaseError) {
      scope.setLevel(error.severity)

      allExtras = combine(extras, error.extras)
      allTags = combine(tags, error.tags)

      error.onError?.(scope, info?.componentStack)
    }

    scope.setExtras(allExtras)
    scope.setTags(allTags)

    onError?.(error, info?.componentStack || '', scope)
    Sentry.captureException(error, {
      contexts: { react: { info } },
    })
  })
}
