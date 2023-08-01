# @tommymarshall/error-handling

A package for handling and reporting errors within React applications.

## Getting Started

Including the following line in your application's `package.json`:

```json
"dependencies": {
  "@tommymarshall/error-handling": "*"
}
```

*Note: The `*` denotes the dependency resides within the monorepo.*

## Developer Workflow

Build a production bundle:

```bash
yarn build
```

Running and watching tests:

```bash
yarn test --watch
```

When working from the web monorepo and making changes to this package:

```bash
yarn dev
```

## Initalizing an Application

In order to track errors properly we need to initialize Sentry. All uncaught errors and caught errors via error boundaries (which calls `captureException` behind the scenes) are sent to Sentry. Any time an error occurs it will use this instance of the Sentry client for reporting errors. As such, all errors will have the correct metadata attached (release version, project ID, configuration, etc.) and pass through the same `beforeSend` ruleset responsible for ignoring certain events.

### Sentry reporting

In order to reuse common functionality across all applications in a monorepo, we have to initialize the application the same way. We export a common initialization function to facilitate this. Add this to the entrypoint of the application.

```ts
import { initializeErrorReporting } from '@tommymarshall/error-handling'

initializeErrorReporting({
  environment: ENVIRONMENT,
  sentryKey: SENTRY_KEY,
  sentryOrg: SENTRY_ORG,
  release: import.meta.env.VITE_SENTRY_RELEASE,
})
```

### React Query

In general, it's [recommended](https://nextjs.org/docs/pages/building-your-application/configuring/error-handling#handling-client-errors) to catch all errors at the nearest error boundary. However, [due to how error boundaries work](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary), an error in a component higher up in the component tree (closer to the root) will unmount its children. This may not be ideal for global application providers as they would render only the error boundary fallback, unmounting their children and losing context where the user was in the application.

There's a simple workaround when working with React Query. We can conditionally render the error boundary from errors triggered in React Query by assigning a function to the `useErrorBoundary` option when initializing the react query client.

In the below example the server could respond with a 401 or 500 error with all other errors are sent to the nearest error boundary. When a server responds with a 500 error we first toast the user with error messaging then call `reportError`, available to us via `useErrorBoundary`. This reports the error to Sentry *without rendering the error boundary*. This is the same function used by the error boundary when reporting errors. We gain all the benefit of having all the correct metadata and context attached to the event without triggering an error boundary.

```tsx
import { useRef } from 'react'
import { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useErrorBoundary } from '@tommymarshall/error-handling'

const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  const { reportError } = useErrorBoundary()
  const checkUseErrorBoundary = useCallback((error) => {
    if (error instanceof AxiosError) {
      const { status } = error.response

      // Don't render error at nearest error boundary for:
      //   1. session expired (401) errors and don't report
      if (status === 401) {
        toast.error('Your session has expired. Please reload the page.')
        return false
      }

      //   2. server failed errors (500 and higher) and report to Sentry
      if (status >= 500) {
        toast.error('Something went wrong. We are looking into it!')
        reportError(error)
        return false
      }
    }

    // Render nearest error boundary for everything else
    return true
  }, [])

  const client = useRef(
    new QueryClient({
      defaultOptions: {
        queries: {
          useErrorBoundary: checkUseErrorBoundary
        },
        mutations: {
          useErrorBoundary: checkUseErrorBoundary
        },
      },
    })
  )

  return (
    <QueryClientProvider client={client.current}>
      {children}
    </QueryClientProvider>
  )
}
```

## `<ErrorBoundary />`

### API

| Prop | Value | Description |
| - | - | - |
| `tags?` | `{ [key: string]: number \| string \| boolean \| bigint \| symbol \| null \| undefined }` | Object containing tags to be sent to Sentry upon error |
| `extras?` | `{ [key: string]: Record<string, unknown> }` | Object containing extras to be sent to Sentry upon error |
| `fallback?` | `(error: Error, resetErrorBoundary: () => void) => ReactNode` | Component to render instead of the default component |
| `onError?` | `(error: Error, componentStack: string, scope: Sentry.Scope) => void` | Callback to be triggered upon error |

### Example

Every error boundary inherits the context from its parent error boundary. This is useful for ensuring errors that occur in any child component includes all relevant metadata needed for helping report that error. Below is a rough example of what would be reported to Sentry. Keys with the same name (`component`, below) will be separated with a `>` to denote the parent-child.

```tsx
const Example = () => {
  return {
    <ErrorBoundary tags={{ partner: 'Partner name' }}>
      /* An error here would include the tags `{ partner: 'Partner name' */
      <ErrorBoundary tags={{ component: 'Chart' }}>
        /* An error here would include the tags `{ partner: 'Partner name', component: 'Chart' } */
        <ErrorBoundary tags={{ component: 'Total Funded' }}>
          /* An error here would include the tags `{ partner: 'Partner name', component: 'Chart > Total Funded' } */
        </ErrorBoundary>
      </ErrorBoundary>
    </ErrorBoundary>
  }
}
```

## Using `useErrorBoundary`

There are [some things error boundaries can't catch](https://www.developerway.com/posts/how-to-handle-errors-in-react#part5) -- namely anything that happens outside of the React lifecycle. For those scenarios we provide a helper function via the `useErrorBoundary` hook.

### API

| Prop | Value | Description |
| - | - | - |
| `showBoundary` | `(error: Error) => void` | Pass the error to the nearest Error Boundary, commonly used with async functions |
| `resetBoundary` | `() => void` | Resets error boundary to display previous state of component |
| `reportError` | `(error: Error) => void` | Reports the error to Sentry without rendering error boundary |


### Async example

Handling async functions so they properly report errors and render the nearest error boundary is simple with the `showBoundary` function. Any async operation can call this function to trigger the display of the error boundary.

```tsx
import { ErrorTypes, useErrorBoundary } from "@tommymarshall/error-handling";

function Example() {
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    fetch(endpoint).then(
      error => {
        showBoundary(error);

        // Or using a built-in error type
        showBoundary(
          new ErrorTypes.GenericError(error?.message)
        )
      }
    );
  });

  return ...
}
```

## Common error types

Common errors used across your codebase are included in `./src/errors-types` folder and can be used like below:

```ts
import { ErrorTypes } from '@tommymarshall/error-handling'

throw new ErrorTypes.MissingRequiredDataError('Business data is missing')

// or within a callback where the error couldn't be caught by an error boundary
showBoundary(new ErrorTypes.GenericError('Something happened'))
```

* [BaseError](src/errors-types/BaseError.ts)
* [GenericError](src/errors-types/GenericError.ts)
* [InvalidDataError](src/errors-types/InvalidDataError.ts)
* [MissingRequiredDataError](src/errors-types/MissingRequiredDataError.ts)
* [SessionExpired](src/errors-types/SessionExpired.ts)

## Custom Errors

It's common that will want to throw a custom error for easier filtering and monitoring within Sentry. In order to improve usability and utilize existing patterns across all errors, we export a `BaseError` error that can extended to implement certain functions that take advantage of our underlying reporting.

### API

| Prop | Value | Description |
| - | - | - |
| `tags?` | `{ [key: string]: number \| string \| boolean \| bigint \| symbol \| null \| undefined }` | Object containing tags to be sent to Sentry upon error |
| `extras?` | `{ [key: string]: Record<string, unknown> }` | Object containing extras to be sent to Sentry upon error |
| `fallback?` | `(resetErrorBoundary: () => void) => ReactNode` | Component to render instead of the default component |
| `onError?` | `(componentStack: string, scope: Sentry.Scope) => void` | Callback to be triggered upon error |

### Example

```ts
import { BaseError } from '@tommymarshall/error-handling'
import { toast } from 'react-hot-toast'

export class CustomLevelError extends BaseError {
  constructor(level) {
    super('CustomLevelError', level, {
      displayMessage: 'An error occurred',
      tags: () => ({
        'foo': 'bar'
      }),
      extra: () => ({
        'ping': 'pong'
      }),
      fallback: (resetErrorBoundary) => {
        const { colors } = useTheme()

        return (
          <>
            <Title>Custom rendered component.</Title>
            <Typography color={colors.mono20}>Your styled components can render here, using your theme, too.</Typography>
            <button onClick={resetErrorBoundary}>Remove error</button>
          </>
        )
      },
      onError: (stacktrace, scope) => {
        logSomewhereElse();

        // toast the user
        toast.error('...')

        // Access to sentry scope https://docs.sentry.io/platforms/javascript/enriching-events/scopes/
        scope.setUser(...)
      }
    })
  }
}
```

### Extra reading

#### What's the difference between tags and extras?

Both `tags` and `extras` are used to provide additional context and information about an error or event. While both serve a similar purpose, there are some differences between them.

* *Tags* are key-value pairs that allow you to add metadata to an event. They provide a way to categorize or label events based on specific criteria. Tags can be useful for filtering and searching for events later on. For example, you can add tags like "environment," "browser," or "user role" to differentiate and group events based on these attributes. Tags are indexed by Sentry and can be used to create custom filters and alert rules.
* *Extras* are arbitrary additional data that you can attach to an event. They provide a way to include any relevant information that might help in debugging or understanding the error. Extras are typically used to include contextual information such as the current user's session data, server-side configuration, or any other relevant variables or values at the time of the error. Unlike tags, extras are not indexed by Sentry and are not suitable for filtering or searching events.
