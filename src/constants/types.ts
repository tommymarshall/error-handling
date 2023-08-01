import {
  Primitive as SentryPrimitive,
  Extras as SentryExtras,
  SeverityLevel as SentrySeverityLevel,
  Scope,
} from '@sentry/types'
import { ReactNode } from 'react'

export type Tags = {
  [key: string]: Primitive
}

export type SeverityLevel = SentrySeverityLevel

export type Extras = SentryExtras

export type Primitive = SentryPrimitive

export type OnErrorType = (
  error: Error,
  componentStack: string,
  scope: Scope
) => void

export interface BaseErrorType extends Error {
  displayMessage?: string
  toastMessage?: string
  tags?: Tags
  extras?: Extras
  fallback?: (resetErrorBoundary: () => void) => ReactNode
  onError?: (stacktrace: any, scope: Scope) => void
}

export type ErrorBoundaryType = {
  showBoundary: (error: Error) => void
  resetBoundary: () => void
  reportError: (error: Error & BaseErrorType) => void
}

export type ReportError = {
  error: Error | BaseErrorType
  info?: { componentStack: string }
  extras?: Extras
  tags?: Tags
  onError?: OnErrorType
}

export type ReportErrorType = ReportError | Error | BaseErrorType
