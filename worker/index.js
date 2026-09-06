/**
 * Cloudflare Worker — proxy do OpenWeatherMap.
 *
 * Powód istnienia: klucz wstrzyknięty do frontendu trafia do bundla i jest publicznie
 * czytelny dla każdego, kto otworzy zakładkę Network. Worker trzyma klucz jako sekret
 * po stronie serwera — przeglądarka nigdy go nie widzi.
 *
 * Sekret ustawiasz komendą:
 *   npx wrangler secret put OPENWEATHER_API_KEY
 */

const UPSTREAM = 'https://api.openweathermap.org'

// Whitelist — bez niej byłby to otwarty proxy do dowolnego endpointu OWM.
const ALLOWED_PATHS = new Set(['/geo/1.0/direct', '/data/2.5/weather', '/data/2.5/forecast'])

// Parametry przepuszczane dalej. `appid` celowo NIE jest na liście —
// dokłada go wyłącznie Worker.
const ALLOWED_PARAMS = ['q', 'lat', 'lon', 'limit', 'units', 'lang']

// Kto może wołać ten Worker. Bez tego dowolna strona w internecie mogłaby
// zużywać limit zapytań na Twoim kluczu.
const ALLOWED_ORIGINS = [
  'https://turbiny-live.web.app',
  'https://turbiny-live.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:4173',
]

// Pogoda z OWM odświeża się w takcie ~10 min — cache na krawędzi oszczędza limit.
const CACHE_SECONDS = 300

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(body, status, origin, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin), ...extra },
  })
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? ''

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    if (request.method !== 'GET') {
      return json({ error: 'Dozwolona jest wyłącznie metoda GET.' }, 405, origin)
    }
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Origin niedozwolony.' }, 403, origin)
    }

    // trim() jest istotny: wklejenie klucza do `wrangler secret put` łatwo dokleja
    // spację lub znak końca linii, a wtedy OpenWeatherMap odrzuca zapytanie z 401.
    const key = env.OPENWEATHER_API_KEY?.trim()
    if (!key) {
      return json(
        { code: 'NO_KEY', error: 'Worker nie ma skonfigurowanego klucza OpenWeatherMap.' },
        503,
        origin,
      )
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api\/owm/, '') || '/'

    if (!ALLOWED_PATHS.has(path)) {
      return json({ error: `Nieobsługiwana ścieżka: ${path}` }, 404, origin)
    }

    const params = new URLSearchParams()
    for (const name of ALLOWED_PARAMS) {
      const value = url.searchParams.get(name)
      if (value != null) params.set(name, value)
    }
    params.set('appid', key)

    try {
      const upstream = await fetch(`${UPSTREAM}${path}?${params}`, {
        cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
      })
      const body = await upstream.text()

      return new Response(body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
          'Cache-Control': upstream.ok
            ? `public, max-age=60, s-maxage=${CACHE_SECONDS}`
            : 'no-store',
          ...corsHeaders(origin),
        },
      })
    } catch (err) {
      console.error('Błąd zapytania do OpenWeatherMap:', err)
      return json({ error: 'Nie udało się połączyć z OpenWeatherMap.' }, 502, origin)
    }
  },
}
