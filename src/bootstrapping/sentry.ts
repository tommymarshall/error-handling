import * as Sentry from '@sentry/react'
import SentryFullStory from '@sentry/fullstory'
import type { Event, ErrorEvent, EventHint } from '@sentry/types'
import * as FullStory from '@fullstory/browser'

export type ReportingType = {
  environment: string
  beforeSend?:
    | ((
        event: ErrorEvent,
        hint: EventHint
      ) => Event | PromiseLike<Event | null> | null)
    | undefined
  sentryKey: string
  sentryOrg: string
  release?: string
  debug?: boolean
}

export const INFO_ERRORS = [
  // LaunchDarkly error that immediately retries to fetch Feature Flags
  'LaunchDarklyFlagFetchError',

  // Due to inactivity
  'Network Error',

  // LaunchDarkly error due to network
  'NetworkError',

  // Safelinks being scanned in Outlook
  'Non-Error promise rejection captured',

  // Authentication errors / token expired
  'Request failed with status code 401',
  'Request failed with status code 400',
]

export const IGNORED_ERRORS = [
  'Non-Error exception captured',
  'Non-Error promise rejection captured',
]

export const initializeErrorReporting = ({
  environment,
  sentryKey,
  sentryOrg,
  beforeSend,
  release,
  debug = false,
}: ReportingType) => {
  Sentry.init({
    dsn: sentryKey,
    autoSessionTracking: true,
    integrations: [new SentryFullStory(sentryOrg, { client: FullStory })],
    tracesSampleRate: 1.0,
    debug,
    environment: environment,
    beforeSend(event, hint) {
      const error = hint.originalException as Error
      if (IGNORED_ERRORS.includes(error?.message ?? '')) {
        return null
      }

      if (INFO_ERRORS.includes(error?.message ?? '')) {
        event.level = 'info'
      }

      if (beforeSend) {
        const result = beforeSend(event, hint)
        if (result !== null && !result) {
          console.error('beforeSend must return an Event or null')
          return event
        }

        return result
      }

      return event
    },
    release,
  })
}
