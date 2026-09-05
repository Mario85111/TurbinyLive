import { RefreshCw, Loader2, KeyRound, MapPin } from 'lucide-react'
import LocationSearch from '../weather/LocationSearch'

function formatAge(lastUpdated) {
  if (!lastUpdated) return null
  const minutes = Math.round((Date.now() - lastUpdated) / 60_000)
  if (minutes < 1) return 'przed chwilą'
  if (minutes < 60) return `${minutes} min temu`
  return `${Math.round(minutes / 60)} h temu`
}

// Kompaktowy nagłówek: lokalizacja + wyszukiwarka + odświeżanie + ostrzeżenie o braku klucza.
export default function Header({ location, onSelectLocation, onRefresh, loading, lastUpdated, noKey }) {
  const age = formatAge(lastUpdated)

  return (
    <header className="relative z-30 mx-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-white/15 bg-slate-900/70 px-3 py-2.5 shadow-glass sm:mx-4 sm:mt-4 sm:px-4">
      {noKey && (
        <span
          className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200"
          title="Ustaw OPENWEATHER_API_KEY po stronie serwera (.env lub sekret Firebase)"
        >
          <KeyRound size={12} /> Brak klucza API
        </span>
      )}

      <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
        <MapPin size={13} className="shrink-0 text-brand-300" />
        <span className="truncate">{location?.name ?? 'Nie wybrano'}</span>
        {age && <span className="hidden shrink-0 text-slate-500 sm:inline">· {age}</span>}
      </div>

      <div className="flex w-full justify-end gap-2 sm:w-auto sm:flex-1">
        <LocationSearch onSelect={onSelectLocation} />
        <button
          type="button"
          onClick={onRefresh}
          className="glass-btn shrink-0"
          disabled={loading || !location}
          title="Odśwież dane"
          aria-label="Odśwież dane"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        </button>
      </div>
    </header>
  )
}
