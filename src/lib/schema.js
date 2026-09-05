// Walidacja i normalizacja stanu odtwarzanego z localStorage.
// Bez tego uszkodzony lub starszy zapis (np. brak `powerCurve`) wywala całą aplikację.

import { TURBINE_PRESETS, DEFAULT_TURBINE, turbineFromPreset } from '../data/turbinePresets'

/** Liczba w zadanym zakresie albo wartość zapasowa. */
function num(value, fallback, { min = -Infinity, max = Infinity } = {}) {
  // Uwaga: Number('') === 0, więc pustego pola formularza nie wolno przepuścić
  // przez zwykłe rzutowanie — inaczej wyczyszczony „Cut-in” zapisałby się jako 0.
  if (value == null) return fallback
  if (typeof value === 'string') {
    if (value.trim() === '') return fallback
    value = value.replace(',', '.')
  }
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Punkty krzywej mocy — odrzuca śmieci, sortuje rosnąco po prędkości. */
function normalizeCurve(raw) {
  if (!Array.isArray(raw)) return null
  const pts = raw
    .filter((p) => p && typeof p === 'object')
    .map((p) => ({ speed: Number(p.speed), power: Number(p.power) }))
    .filter((p) => Number.isFinite(p.speed) && Number.isFinite(p.power) && p.speed >= 0)
    .sort((a, b) => a.speed - b.speed)
  return pts.length > 0 ? pts : null
}

/**
 * Sprowadza dowolny odczyt z localStorage do kompletnego, bezpiecznego obiektu turbiny.
 * Braki uzupełnia z presetu wskazanego przez `presetId` (albo z domyślnego).
 */
export function normalizeTurbine(raw) {
  const preset =
    (raw && TURBINE_PRESETS.find((p) => p.id === raw.presetId)) || DEFAULT_TURBINE
  const base = turbineFromPreset(preset)
  if (!raw || typeof raw !== 'object') return base

  return {
    ...base,
    ratedPowerKW: num(raw.ratedPowerKW, base.ratedPowerKW, { min: 0, max: 50_000 }),
    rotorDiameter: num(raw.rotorDiameter, base.rotorDiameter, { min: 1, max: 400 }),
    hubHeight: num(raw.hubHeight, base.hubHeight, { min: 1, max: 300 }),
    turbineCount: Math.round(num(raw.turbineCount, base.turbineCount, { min: 1, max: 1000 })),
    cutIn: num(raw.cutIn, base.cutIn, { min: 0, max: 30 }),
    cutOut: num(raw.cutOut, base.cutOut, { min: 1, max: 60 }),
    terrainAlpha: num(raw.terrainAlpha, base.terrainAlpha, { min: 0, max: 1 }),
    powerCurve: normalizeCurve(raw.powerCurve) ?? base.powerCurve,
  }
}

/** Lokalizacja musi mieć sensowne współrzędne geograficzne. */
export function normalizeLocation(raw, fallback) {
  if (!raw || typeof raw !== 'object') return fallback
  const lat = Number(raw.lat)
  const lon = Number(raw.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return fallback
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return fallback
  return { name: typeof raw.name === 'string' && raw.name ? raw.name : `${lat}, ${lon}`, lat, lon }
}
