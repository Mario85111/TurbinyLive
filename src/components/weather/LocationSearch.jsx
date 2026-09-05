import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { geocode } from '../../api/weather'

// Wyszukiwarka lokalizacji (geokodowanie nazwy miasta na współrzędne).
export default function LocationSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef(null)

  // Klik poza komponentem zamyka listę podpowiedzi.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const found = await geocode(query.trim())
      setResults(found)
      setHighlight(0)
      setOpen(found.length > 0)
      if (found.length === 0) setError('Brak wyników dla tej nazwy.')
    } catch (err) {
      setError(err.message)
      setResults([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  function pick(r) {
    onSelect({
      name: [r.name, r.country].filter(Boolean).join(', '),
      lat: r.lat,
      lon: r.lon,
    })
    setOpen(false)
    setQuery('')
    setResults([])
    setError(null)
  }

  // Obsługa klawiatury na liście wyników — wcześniej dało się ją wybrać tylko myszą.
  function onKeyDown(e) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full sm:max-w-sm">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="glass-input pl-9"
            placeholder="Szukaj lokalizacji (np. Gdańsk)…"
            aria-label="Szukaj lokalizacji"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls="location-results"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <button type="submit" className="glass-btn glass-btn-primary shrink-0" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Szukaj'}
        </button>
      </form>

      {error && (
        <p className="mt-1.5 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}

      {open && results.length > 0 && (
        <ul
          id="location-results"
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/15 bg-slate-900/95 p-1 shadow-glass backdrop-blur-xl"
        >
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lon}-${i}`} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onClick={() => pick(r)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  i === highlight ? 'bg-white/10' : ''
                }`}
              >
                <MapPin size={14} className="shrink-0 text-brand-300" />
                <span className="truncate">
                  {r.name}{' '}
                  <span className="text-slate-400">
                    {[r.state, r.country].filter(Boolean).join(', ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
