import { ReactNode } from 'react'
import { Scope } from '@sentry/types'
import { Extras, SeverityLevel, Tags, BaseErrorType } from '../constants/types'

export abstract class BaseError extends Error {
  public severity = 'error' as SeverityLevel
  public displayMessage?: string
  public toastMessage?: string
  public tags: Tags
  public extras: Extras
  public fallback?: (resetErrorBoundary: () => void) => ReactNode
  public onError?: (scope: Scope, stacktrace: any) => void

  constructor(
    message: string,
    severity: SeverityLevel,
    options: Omit<BaseErrorType, 'name' | 'message'> = {}
  ) {
    const {
      displayMessage,
      toastMessage,
      tags = {},
      extras = {},
      fallback,
      onError,
    } = options
    super(message)
    this.name = this.constructor.name
    this.severity = severity
    this.displayMessage = displayMessage
    this.toastMessage = toastMessage
    this.tags = tags
    this.extras = extras
    this.fallback = fallback
    this.onError = onError
  }
}
