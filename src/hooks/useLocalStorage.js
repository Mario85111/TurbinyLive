import { useCallback, useEffect, useState } from 'react'

/**
 * Stan synchronizowany z localStorage — przechowuje wybraną lokalizację i parametry turbiny.
 * API zgodne z useState.
 *
 * @param {string} key klucz w localStorage
 * @param {*} initialValue wartość początkowa przy braku zapisu
 * @param {(raw:*) => *} [normalize] walidacja odczytu — chroni przed uszkodzonym
 *   lub starszym schematem, który inaczej wywaliłby aplikację przy starcie
 */
export function useLocalStorage(key, initialValue, normalize) {
  const [value, setValue] = useState(() => {
    let raw = null
    try {
      const stored = window.localStorage.getItem(key)
      raw = stored != null ? JSON.parse(stored) : initialValue
    } catch {
      raw = initialValue
    }
    try {
      return normalize ? normalize(raw) : raw
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* quota / tryb prywatny — ignorujemy */
    }
  }, [key, value])

  const reset = useCallback(() => setValue(initialValue), [initialValue])

  return [value, setValue, reset]
}
