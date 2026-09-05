import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const UPSTREAM = 'https://api.openweathermap.org'

export default defineConfig(({ mode }) => {
  // Klucz czytany po stronie serwera dev — celowo bez prefiksu VITE_,
  // żeby Vite nie mógł go wstrzyknąć do bundla przeglądarki.
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.OPENWEATHER_API_KEY ?? ''

  // Odpowiednik produkcyjnej Firebase Function: dokłada `appid` po stronie serwera,
  // dzięki czemu w dev, w podglądzie i na produkcji obowiązuje ta sama ścieżka /api/owm.
  const owmProxy = {
    '/api/owm': {
      target: UPSTREAM,
      changeOrigin: true,
      rewrite: (path) => {
        const [pathname, search = ''] = path.replace(/^\/api\/owm/, '').split('?')
        const params = new URLSearchParams(search)
        params.set('appid', apiKey)
        return `${pathname}?${params}`
      },
    },
  }

  return {
    plugins: [react()],
    server: { port: 5173, open: true, proxy: owmProxy },
    preview: { port: 4173, proxy: owmProxy },
    build: {
      rollupOptions: {
        output: {
          // Recharts + d3 to ~2/3 bundla i zmieniają się rzadko — osobny chunk
          // pozwala im zostać w cache przeglądarki między wdrożeniami aplikacji.
          // Podział funkcją, bo React jest zależnością Rechartsa i przy zapisie
          // obiektowym wpadał do tej samej paczki.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
            if (/[\\/]node_modules[\\/](recharts|d3-|victory-|internmap)/.test(id)) return 'charts'
            return 'vendor'
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  }
})
