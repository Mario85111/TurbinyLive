// Klient OpenWeatherMap (Geocoding, Current Weather, 5-day/3-hour Forecast).
//
// Zapytania idą przez własny proxy — klucz API dokłada serwer i nigdy nie trafia
// do przeglądarki:
//   • dev / preview → ścieżka względna /api/owm, obsłużona przez proxy Vite,
//   • produkcja     → VITE_API_BASE, czyli adres Cloudflare Workera.
//
// VITE_API_BASE to publiczny URL, nie sekret — jego obecność w bundlu jest w porządku.

const BASE = import.meta.env.VITE_API_BASE || '/api/owm'

export class WeatherError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'WeatherError'
    this.code = code
  }
}

async function getJson(path, params) {
  const query = new URLSearchParams(params)
  let res
  try {
    res = await fetch(`${BASE}${path}?${query}`)
  } catch {
    throw new WeatherError('Błąd sieci — sprawdź połączenie z internetem.', 'NETWORK')
  }

  if (res.status === 401) {
    throw new WeatherError(
      'Serwer odrzucił klucz API (401). Nowy klucz może wymagać do ~2 h na aktywację.',
      'UNAUTHORIZED',
    )
  }
  if (res.status === 404) {
    throw new WeatherError('Nie znaleziono lokalizacji (404).', 'NOT_FOUND')
  }
  if (res.status === 429) {
    throw new WeatherError('Przekroczono limit zapytań API (429). Spróbuj za chwilę.', 'RATE_LIMIT')
  }
  if (res.status === 503) {
    throw new WeatherError(
      'Serwer nie ma skonfigurowanego klucza OpenWeatherMap. Ustaw OPENWEATHER_API_KEY.',
      'NO_KEY',
    )
  }
  if (!res.ok) {
    throw new WeatherError(`Błąd API (${res.status}).`, 'HTTP')
  }

  try {
    return await res.json()
  } catch {
    throw new WeatherError('Serwer zwrócił nieprawidłową odpowiedź.', 'BAD_RESPONSE')
  }
}

/**
 * Geokodowanie nazwy miejscowości na współrzędne.
 * @param {string} query np. "Gdańsk" lub "Gdansk, PL"
 * @returns {Promise<Array<{name, country, state, lat, lon}>>}
 */
export async function geocode(query) {
  const data = await getJson('/geo/1.0/direct', { q: query, limit: 5 })
  return (Array.isArray(data) ? data : []).map((d) => ({
    name: d.local_names?.pl || d.name,
    country: d.country,
    state: d.state,
    lat: d.lat,
    lon: d.lon,
  }))
}

/** Aktualna pogoda dla współrzędnych (units=metric → m/s, °C, hPa). */
export async function getCurrentWeather(lat, lon) {
  const d = await getJson('/data/2.5/weather', { lat, lon, units: 'metric', lang: 'pl' })
  return {
    location: d.name,
    country: d.sys?.country,
    coords: { lat: d.coord?.lat, lon: d.coord?.lon },
    wind: {
      speed: d.wind?.speed ?? 0, // m/s @ ~10 m
      deg: d.wind?.deg ?? 0,
      gust: d.wind?.gust ?? null,
    },
    temp: d.main?.temp ?? null, // °C
    pressure: d.main?.pressure ?? null, // hPa
    humidity: d.main?.humidity ?? null, // %
    description: d.weather?.[0]?.description ?? '',
    icon: d.weather?.[0]?.icon ?? null,
    timestamp: d.dt ? d.dt * 1000 : Date.now(),
  }
}

/** Prognoza 5-dniowa w krokach 3 h — używana do wykresu i szacunku produkcji. */
export async function getForecast(lat, lon) {
  const d = await getJson('/data/2.5/forecast', { lat, lon, units: 'metric', lang: 'pl' })
  return (d.list ?? []).map((item) => ({
    time: item.dt * 1000,
    windSpeed: item.wind?.speed ?? 0,
    windDeg: item.wind?.deg ?? 0,
    temp: item.main?.temp ?? null,
    pressure: item.main?.pressure ?? null,
  }))
}
