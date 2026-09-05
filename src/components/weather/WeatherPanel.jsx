import { Navigation, Thermometer, Gauge, Droplets, Clock, Loader2, AlertTriangle } from 'lucide-react'

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
function degToCompass(deg) {
  if (!Number.isFinite(deg)) return '—'
  return DIRS[((Math.round(deg / 45) % 8) + 8) % 8]
}

function MiniStat({ icon: Icon, label, value, unit, accent = 'text-brand-300' }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
        <Icon size={11} className={accent} />
        {label}
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-base font-semibold text-slate-50">{value ?? '—'}</span>
        {unit && <span className="text-[11px] text-slate-400">{unit}</span>}
      </div>
    </div>
  )
}

// Kompaktowy poziomy panel pogodowy — mieści się w ~72 px wysokości.
export default function WeatherPanel({ current, loading, error, hubWind, densityFactor }) {
  if (error) {
    return (
      <div className="glass flex items-center gap-2 border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
        <AlertTriangle size={14} className="shrink-0 text-rose-300" />
        {error.message}
      </div>
    )
  }

  if (loading && !current) {
    return (
      <div className="glass flex items-center justify-center gap-2 px-4 py-3 text-xs text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Pobieram dane pogodowe…
      </div>
    )
  }

  if (!current) {
    return (
      <div className="glass px-4 py-3 text-center text-xs text-slate-400">
        Wyszukaj lokalizację, aby zobaczyć warunki pogodowe.
      </div>
    )
  }

  const updated = new Date(current.timestamp).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="glass flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-5">
      {/* Kierunek wiatru — obracana strzałka */}
      <div className="flex shrink-0 items-center gap-3 sm:border-r sm:border-white/10 sm:pr-5">
        <Navigation
          size={26}
          className="shrink-0 text-brand-300"
          style={{ transform: `rotate(${(current.wind.deg + 180) % 360}deg)` }}
          fill="currentColor"
        />
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Wiatr (10 m)</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold leading-none text-slate-50">
              {current.wind.speed.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">m/s</span>
          </div>
          <div className="text-xs text-slate-400">
            {degToCompass(current.wind.deg)} · {Math.round(current.wind.deg)}°
            {current.wind.gust != null && ` · poryw ${current.wind.gust.toFixed(1)}`}
          </div>
        </div>
      </div>

      {/* Wiatr na piaście */}
      {hubWind != null && (
        <div className="shrink-0 sm:border-r sm:border-white/10 sm:pr-5">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Na piaście</div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold leading-none text-brand-200">
              {hubWind.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">m/s</span>
          </div>
          {densityFactor !== 1 && (
            <div className="text-[10px] text-slate-500">kor. ×{densityFactor.toFixed(3)}</div>
          )}
        </div>
      )}

      {/* Pozostałe parametry */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <MiniStat
          icon={Thermometer}
          label="Temperatura"
          value={current.temp != null ? current.temp.toFixed(1) : null}
          unit="°C"
          accent="text-amber-300"
        />
        <MiniStat
          icon={Gauge}
          label="Ciśnienie"
          value={current.pressure}
          unit="hPa"
          accent="text-emerald-300"
        />
        <MiniStat
          icon={Droplets}
          label="Wilgotność"
          value={current.humidity}
          unit="%"
          accent="text-sky-300"
        />
        <MiniStat
          icon={Clock}
          label="Aktualizacja"
          value={updated}
          accent="text-violet-300"
        />
        {current.description && (
          <span className="text-xs capitalize text-slate-400 sm:ml-auto">{current.description}</span>
        )}
      </div>
    </div>
  )
}
