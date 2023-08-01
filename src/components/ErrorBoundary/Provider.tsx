import { ReactNode, createContext, useContext } from 'react'
import { BaseErrorType, Extras, Tags } from '../../constants/types'
import { combine } from '../../utils/combine'

export type Fallback = (
  error: Error & BaseErrorType,
  resetErrorBoundary: () => void
) => ReactNode | undefined

export type ErrorBoundaryContextType = {
  children?: ReactNode
  extras?: Extras
  tags?: Tags
  fallback?: Fallback
}

export const ErrorBoundaryContext = createContext<ErrorBoundaryContextType>({
  extras: {},
  tags: {},
  fallback: undefined,
})

export const ErrorBoundaryProvider = ({
  children,
  tags,
  extras,
  fallback,
}: ErrorBoundaryContextType) => {
  const context = useContext(ErrorBoundaryContext)

  return (
    <ErrorBoundaryContext.Provider
      value={{
        extras: combine<Extras>(context.extras, extras),
        tags: combine<Tags>(context.tags, tags),
        fallback,
      }}
    >
      {children}
    </ErrorBoundaryContext.Provider>
  )
}
