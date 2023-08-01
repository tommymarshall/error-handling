import { afterEach, describe, expect, it, vi, Mock } from 'vitest'
import * as Sentry from '@sentry/react'
import SentryFullStory from '@sentry/fullstory'
import * as FullStory from '@fullstory/browser'
import { INFO_ERRORS, initializeErrorReporting, ReportingType } from './sentry'

vi.mock('@sentry/react')
vi.mock('@sentry/fullstory')
vi.mock('@fullstory/browser')

describe('initializeErrorReporting', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  const mockReportingConfig: ReportingType = {
    environment: 'test',
    sentryKey: 'your-sentry-key',
    sentryOrg: 'your-sentry-org',
    beforeSend: vi.fn(),
    release: '1.0.0',
    debug: true,
  }

  it('should initialize Sentry with the provided configuration', () => {
    initializeErrorReporting(mockReportingConfig)

    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: mockReportingConfig.sentryKey,
      autoSessionTracking: true,
      integrations: [
        new SentryFullStory(mockReportingConfig.sentryOrg, {
          client: FullStory,
        }),
      ],
      tracesSampleRate: 1.0,
      debug: mockReportingConfig.debug,
      environment: mockReportingConfig.environment,
      beforeSend: expect.any(Function),
      release: mockReportingConfig.release,
    })
  })

  it('should call the beforeSend function if provided and return the modified event', () => {
    const mockEvent = vi.fn()
    const mockHint = vi.fn()
    const mockModifiedEvent = vi.fn()
    const modifiedBeforeSend = vi.fn().mockReturnValue(mockModifiedEvent)
    const modifiedReportingConfig = {
      ...mockReportingConfig,
      beforeSend: modifiedBeforeSend,
    }

    initializeErrorReporting(modifiedReportingConfig)

    const beforeSendCallback = (Sentry.init as Mock).mock.calls[0][0].beforeSend

    const result = beforeSendCallback(mockEvent, mockHint)

    expect(modifiedBeforeSend).toHaveBeenCalledWith(mockEvent, mockHint)
    expect(result).toBe(mockModifiedEvent)
  })

  it('should call the beforeSend function and return null if callback returns null', () => {
    const mockEvent = vi.fn()
    const mockHint = vi.fn()

    const modifiedBeforeSend = vi.fn().mockReturnValue(null)
    const modifiedReportingConfig = {
      ...mockReportingConfig,
      beforeSend: modifiedBeforeSend,
    }

    initializeErrorReporting(modifiedReportingConfig)

    const beforeSendCallback = (Sentry.init as Mock).mock.calls[0][0].beforeSend

    const result = beforeSendCallback(mockEvent, mockHint)

    expect(modifiedBeforeSend).toHaveBeenCalledWith(mockEvent, mockHint)
    expect(result).toBe(null)
  })

  it('should handle beforeSend function returning a non-null and non-Event value', () => {
    const mockEvent = vi.fn()
    const mockHint = vi.fn()

    const modifiedBeforeSend = vi.fn().mockReturnValue(undefined)
    const modifiedReportingConfig = {
      ...mockReportingConfig,
      beforeSend: modifiedBeforeSend,
    }

    console.error = vi.fn()

    initializeErrorReporting(modifiedReportingConfig)

    const beforeSendCallback = (Sentry.init as Mock).mock.calls[0][0].beforeSend

    const result = beforeSendCallback(mockEvent, mockHint)

    expect(modifiedBeforeSend).toHaveBeenCalledWith(mockEvent, mockHint)
    expect(result).toBe(mockEvent)
    expect(console.error).toHaveBeenCalledWith(
      'beforeSend must return an Event or null'
    )
  })

  it('should set event level to info for ignored errors', () => {
    const mockEvent = {
      message: INFO_ERRORS[1],
      level: 'error',
    }
    const mockHint = {
      originalException: {
        message: INFO_ERRORS[1],
        level: 'error',
      },
    }
    const modifiedBeforeSend = vi.fn()
    const modifiedReportingConfig = {
      ...mockReportingConfig,
      beforeSend: modifiedBeforeSend,
    }

    initializeErrorReporting(modifiedReportingConfig)

    const beforeSendCallback = (Sentry.init as Mock).mock.calls[0][0].beforeSend

    const result = beforeSendCallback(mockEvent, mockHint)
    expect(result).toContain({
      message: INFO_ERRORS[1],
      level: 'info',
    })
  })
})
