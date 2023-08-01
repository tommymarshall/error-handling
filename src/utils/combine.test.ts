import { combine } from './combine'
import { expect } from 'vitest'

test('combine returns an empty object if either context or local is missing or empty', () => {
  const result = combine()
  expect(result).toEqual({})

  const result2 = combine({}, {})
  expect(result2).toEqual({})
})

test('combine returns an empty object if context is not an object', () => {
  const result = combine({ c: 3 }, { a: 1, b: 2 })
  expect(result).toEqual({ a: 1, b: 2, c: 3 })
})

test('combine combines context and local objects correctly', () => {
  const context = { a: 'valueA', b: 'valueB' }
  const local = { b: 'newB', c: 'valueC' }
  const result = combine<Record<string, unknown>>(context, local)
  expect(result).toEqual({ a: 'valueA', b: 'valueB > newB', c: 'valueC' })
})
