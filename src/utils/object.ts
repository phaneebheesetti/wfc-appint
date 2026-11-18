export const filterOutObjectUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== undefined)) as Partial<T>
}

export const filterOutObjectUndefinedAndNull = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined && value !== null)
  ) as Partial<T>
}

export function sortObjectByKeyOrder<T extends Record<string, unknown>>(obj: T, orderArray: string[]): T {
  const result = {} as T
  const processedKeys = new Set<string>()

  // First, add properties in the specified order
  for (const key of orderArray) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      ;(result as Record<string, unknown>)[key] = obj[key]
      processedKeys.add(key)
    }
  }

  // Then, add any remaining properties that weren't in the order array
  for (const key of Object.keys(obj)) {
    if (!processedKeys.has(key)) {
      ;(result as Record<string, unknown>)[key] = obj[key]
    }
  }

  return result
}
