import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    onConsoleLog(log) {
      const ignoredErrors = [
        'CustomError: CustomError',
        'ReportOnlyError: ReportOnlyError',
        'Error: Uncaught [DisplayMessageError: The custom error message]',
        'Error: Uncaught [RenderChildrenError: An error occurred]',
        'Error: Uncaught [ReportOnlyError: ReportOnlyError]',
        'Error: Uncaught [Error: Test error]',
        'Error: Uncaught [CustomError: CustomError]',
      ]

      if (!ignoredErrors.includes(log)) {
        return false
      }
    },
  },
})
