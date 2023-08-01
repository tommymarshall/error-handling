export function combine<T>(context?: T, local?: T): T {
  if (!local || !context || typeof context !== 'object') return {} as T

  const combined = { ...context, ...local } as Record<string, unknown>

  Object.keys(combined).forEach((key) => {
    const l = local[key as keyof T]
    const c = context[key as keyof T]
    combined[key] = c && l !== undefined ? `${c} > ${l}` : l || c
  })

  return combined as T
}
