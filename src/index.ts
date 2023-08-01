export {
  reportError,
  ErrorBoundary,
  useErrorContext,
  useErrorBoundary,
} from './components/ErrorBoundary'

import * as Types from './constants/types'
import * as ErrorTypes from './errors-types'
import { initializeErrorReporting } from './bootstrapping/sentry'

export { ErrorTypes, initializeErrorReporting, Types }

export const BaseError = ErrorTypes.BaseError
