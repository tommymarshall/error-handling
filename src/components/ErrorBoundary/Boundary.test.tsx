import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '../../tests/utils'
import { BaseError } from '../../errors-types'
import { ErrorBoundary } from './Boundary'
import * as Sentry from '@sentry/react'
import { Scope } from '@sentry/types'
import { useErrorBoundary } from './hooks'
import { reportError } from './reportError'

const ErrorThrower = () => {
  throw new Error('Test error')
}

const defaultScope = {
  setExtra: vi.fn(),
  setExtras: vi.fn(),
  setLevel: vi.fn(),
  setTag: vi.fn(),
  setTags: vi.fn(),
} as unknown as Sentry.Scope

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('captures and reports error to Sentry', () => {
    const spyException = vi.spyOn(Sentry, 'captureException')
    vi.spyOn(Sentry, 'withScope').mockImplementation((fn) => {
      const scope = defaultScope
      fn(scope)
      expect(scope.setExtras).toHaveBeenCalledWith({})
      expect(scope.setTags).toHaveBeenCalledWith({})
    })

    render(
      <ErrorBoundary>
        <ErrorThrower />
      </ErrorBoundary>
    )

    expect(spyException).toHaveBeenCalledOnce()
  })

  it('captures and reports error to Sentry with tags', () => {
    vi.spyOn(Sentry, 'withScope').mockImplementation((fn) => {
      const scope = defaultScope
      fn(scope)
      expect(scope.setTags).toHaveBeenCalledWith({ name: 'Acme Company' })
    })

    render(
      <ErrorBoundary tags={{ name: 'Acme Company' }}>
        <ErrorThrower />
      </ErrorBoundary>
    )
  })

  it('renders the closest render fallback when provided', () => {
    render(
      <ErrorBoundary fallback={() => <div>Do not render fallback</div>}>
        <ErrorBoundary fallback={() => <div>Render this fallback</div>}>
          <ErrorThrower />
        </ErrorBoundary>
      </ErrorBoundary>
    )

    expect(screen.queryByText('Do not render fallback')).toBeNull()
    expect(screen.getByText('Render this fallback')).toBeDefined()
  })

  it('renders the top-most render fallback when provided above nested ErrorBoundarys', () => {
    render(
      <ErrorBoundary fallback={() => <div>Root fallback</div>}>
        <ErrorBoundary>
          <ErrorBoundary>
            <ErrorThrower />
          </ErrorBoundary>
        </ErrorBoundary>
      </ErrorBoundary>
    )

    expect(screen.getByText('Root fallback')).toBeDefined()
  })

  it('renders the correct fallback in order of precedence', () => {
    class CustomError extends BaseError {
      constructor() {
        super('CustomError', 'info', {
          fallback: () => <div>This is the one to render</div>,
        })
      }
    }

    const CustomErrorThrower = () => {
      throw new CustomError()
    }

    render(
      <ErrorBoundary fallback={() => <div>Do not render fallback</div>}>
        <ErrorBoundary
          fallback={() => <div>Do not even render this fallback</div>}
        >
          <CustomErrorThrower />
        </ErrorBoundary>
      </ErrorBoundary>
    )

    expect(screen.queryByText('Do not render fallback')).toBeNull()
    expect(screen.queryByText('Do not even render this fallback')).toBeNull()
    expect(screen.queryByText('This is the one to render')).not.toBeNull()
  })

  it('captures and reports nested error boundary tags to Sentry', () => {
    const spyException = vi.spyOn(Sentry, 'captureException')
    vi.spyOn(Sentry, 'withScope').mockImplementation((fn) => {
      const scope = defaultScope
      fn(scope)
      expect(scope.setExtras).toHaveBeenCalledOnce()
      expect(scope.setExtras).toHaveBeenCalledWith({})
      expect(scope.setTags).toHaveBeenCalledOnce()
      expect(scope.setTags).toHaveBeenCalledWith({
        application: 'ACME Company',
        page: 'Home',
        section: 'Article',
      })
    })

    render(
      <ErrorBoundary tags={{ application: 'ACME Company' }}>
        <ErrorBoundary tags={{ page: 'Home' }}>
          <ErrorBoundary tags={{ section: 'Article' }}>
            <ErrorThrower />
          </ErrorBoundary>
        </ErrorBoundary>
      </ErrorBoundary>
    )

    expect(spyException).toHaveBeenCalledOnce()
  })

  it('renders default fallback when error occurs and no custom fallback is provided', () => {
    render(
      <ErrorBoundary>
        <ErrorThrower />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test error')).toBeDefined()
  })

  it('calls custom fallback render function when error occurs and custom fallback is provided', () => {
    const CustomFallback = () => (
      <div data-testid="custom-fallback">Custom fallback</div>
    )

    render(
      <ErrorBoundary fallback={() => <CustomFallback />}>
        <ErrorThrower />
      </ErrorBoundary>
    )

    expect(screen.queryByText('Test error')).toBeNull()
    expect(screen.getByTestId('custom-fallback')).toBeDefined()
  })

  it('handles custom error classes with custom severity, tags, extras, and render content', () => {
    class CustomError extends BaseError {
      constructor() {
        super('CustomError', 'info', {
          onError: (scope: Scope, stacktrace: any) => {
            scope.setTag('setTagOnError', 'tag error')
          },
          tags: {
            business: 'Sub business',
            customTag: 'custom value',
          },
          extras: {
            customExtra: 'custom value',
          },
          fallback: () => (
            <div data-testid="custom-error">This is the Custom Error</div>
          ),
        })
      }
    }

    const CustomErrorThrower = () => {
      throw new CustomError()
    }

    const spyException = vi.spyOn(Sentry, 'captureException')

    vi.spyOn(Sentry, 'withScope').mockImplementation((fn) => {
      const scope = defaultScope
      fn(scope)

      expect(scope.setLevel).toHaveBeenCalledWith('info')
      expect(scope.setExtras).toHaveBeenCalledWith({
        customExtra: 'custom value',
      })
      expect(scope.setTags).toHaveBeenCalledWith({
        business: 'Acme Company > Sub business',
        customTag: 'custom value',
      })
      expect(scope.setTag).toHaveBeenCalledWith('setTagOnError', 'tag error')
    })

    render(
      <ErrorBoundary tags={{ business: 'Acme Company' }}>
        <CustomErrorThrower />
      </ErrorBoundary>
    )

    expect(spyException).toHaveBeenCalledOnce()
    expect(screen.getByTestId('custom-error')).toBeDefined()
    expect(screen.getByText('This is the Custom Error')).toBeDefined()
  })

  it('can call reportError directly', async () => {
    const spyException = vi.spyOn(Sentry, 'captureException')

    vi.spyOn(Sentry, 'withScope').mockImplementation((fn) => {
      const scope = defaultScope
      fn(scope)
    })

    render(
      <button onClick={() => reportError(new Error('Test error'))}>
        Report error
      </button>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Report error'))
    })

    expect(spyException).toHaveBeenCalledOnce()
  })

  it('can call reportError in a child component without displaying error boundary', async () => {
    const ReportErrorStandalone = () => {
      return (
        <button onClick={() => reportError(new Error('Test error'))}>
          Report error
        </button>
      )
    }

    const spyException = vi.spyOn(Sentry, 'captureException')

    vi.spyOn(Sentry, 'withScope').mockImplementation((fn) => {
      const scope = defaultScope
      fn(scope)
    })

    render(
      <ErrorBoundary fallback={() => <>Fallback Boundary Content</>}>
        <ReportErrorStandalone />
      </ErrorBoundary>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Report error'))
    })

    expect(spyException).toHaveBeenCalledOnce()
    expect(screen.queryByText('Fallback Boundary Content')).toBeNull()
  })

  it('can call reportError via useErrorBoundary with correct context', async () => {
    const ReportErrorStandalone = () => {
      const { reportError } = useErrorBoundary()

      return (
        <button onClick={() => reportError(new Error())}>Report error</button>
      )
    }

    const spyException = vi.spyOn(Sentry, 'captureException')

    vi.spyOn(Sentry, 'withScope').mockImplementation((fn) => {
      const scope = defaultScope
      fn(scope)
      expect(scope.setExtras).toHaveBeenCalledWith({
        ping: 'pong',
      })
      expect(scope.setTags).toHaveBeenCalledWith({
        foo: 'bar',
      })
    })

    render(
      <ErrorBoundary tags={{ foo: 'bar' }} extras={{ ping: 'pong' }}>
        <ReportErrorStandalone />
      </ErrorBoundary>
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Report error'))
    })

    expect(spyException).toHaveBeenCalledOnce()
  })

  it('renders `displayMessage` when error is thrown', async () => {
    class DisplayMessageError extends BaseError {
      constructor(message: string) {
        super(message, 'error', {
          displayMessage: `DisplayMessage error: ${message}`,
        })
      }
    }

    const DisplayMessage = () => {
      throw new DisplayMessageError('The custom error message')
    }

    render(
      <ErrorBoundary>
        <DisplayMessage />
      </ErrorBoundary>
    )

    // Default test ID for error message
    expect(screen.getByTestId('error-handling-message')).toBeDefined()
    expect(
      screen.getByText('DisplayMessage error: The custom error message')
    ).toBeDefined()
  })

  it('renders `displayMessage` when error is thrown to fallback', () => {
    class DisplayMessageError extends BaseError {
      constructor(message: string) {
        super(message, 'error', {
          displayMessage: `Fallback display message: ${message}`,
        })
      }
    }

    const DisplayMessage = () => {
      throw new DisplayMessageError('The other custom error message')
    }

    render(
      <ErrorBoundary
        fallback={function (e: any) {
          return (
            <div data-testid="fallback-display-message">{e.displayMessage}</div>
          )
        }}
      >
        <DisplayMessage />
      </ErrorBoundary>
    )
    // Default test ID for error message
    expect(screen.getByTestId('fallback-display-message')).toBeDefined()
    expect(
      screen.getByText(
        'Fallback display message: The other custom error message'
      )
    ).toBeDefined()
  })
})
