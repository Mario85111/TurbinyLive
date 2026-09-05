import { useMemo, useState } from 'react'
import { Settings2, SlidersHorizontal, TrendingUp, Mail } from 'lucide-react'
import TurbineIcon from './components/ui/TurbineIcon'
import Header from './components/layout/Header'
import GlassCard from './components/ui/GlassCard'
import WeatherPanel from './components/weather/WeatherPanel'
import TurbineForm from './components/turbine/TurbineForm'
import ProductionEstimate from './components/production/ProductionEstimate'
import PowerCurveChart from './components/production/PowerCurveChart'
import ForecastChart from './components/production/ForecastChart'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useWeather } from './hooks/useWeather'
import { extrapolateWind, powerAt } from './lib/energy'
import { densityCorrectionFactor } from './lib/airDensity'
import { DEFAULT_TURBINE, turbineFromPreset } from './data/turbinePresets'
import { normalizeTurbine, normalizeLocation } from './lib/schema'

const DEFAULT_LOCATION = { name: 'Gdańsk, PL', lat: 54.352, lon: 18.6466 }

const TABS = [
  { id: 'turbina', label: 'Turbina', icon: Settings2 },
  { id: 'praca',   label: 'Praca',   icon: SlidersHorizontal },
  { id: 'krzywa',  label: 'Krzywa',  icon: TrendingUp },
]

export default function App() {
  const [location, setLocation] = useLocalStorage('oze:location', DEFAULT_LOCATION, (raw) =>
    normalizeLocation(raw, DEFAULT_LOCATION),
  )
  const [turbine, setTurbine] = useLocalStorage(
    'oze:turbine',
    turbineFromPreset(DEFAULT_TURBINE),
    normalizeTurbine,
  )
  const [activeTab, setActiveTab] = useState('turbina')

  const { current, forecast, loading, error, lastUpdated, refresh } = useWeather(location)

  const densityFactor = useMemo(() => {
    if (!current || current.temp == null || current.pressure == null) return 1
    return densityCorrectionFactor(current.temp, current.pressure)
  }, [current])

  const hubWind = useMemo(() => {
    if (!current?.wind) return null
    return extrapolateWind(current.wind.speed, turbine.hubHeight, turbine.terrainAlpha)
  }, [current, turbine.hubHeight, turbine.terrainAlpha])

  const operatingPoint = useMemo(() => {
    if (hubWind == null) return null
    const power = powerAt(hubWind, turbine.powerCurve, {
      cutIn: turbine.cutIn,
      cutOut: turbine.cutOut,
      densityFactor,
    })
    return { speed: Number(hubWind.toFixed(1)), power }
  }, [hubWind, turbine.powerCurve, turbine.cutIn, turbine.cutOut, densityFactor])

  return (
    // Poniżej `lg` układ jest pionowy i przewijalny; od `lg` w górę — pełnoekranowy dashboard.
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">

      {/* ── NAGŁÓWEK ── */}
      <Header
        location={location}
        onSelectLocation={setLocation}
        onRefresh={refresh}
        loading={loading}
        lastUpdated={lastUpdated}
        noKey={error?.code === 'NO_KEY'}
      />

      {/* ── PRZESTRZEŃ ROBOCZA ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 pt-3 sm:p-4 sm:pt-3 lg:flex-row lg:gap-4 lg:overflow-hidden">

        {/* ══ PANEL STEROWANIA ══ */}
        <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-80 lg:overflow-hidden">

          {/* Marka + zakładki */}
          <div className="glass flex flex-col gap-3 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/30 text-brand-200">
                <TurbineIcon size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-50">Turbiny Live</div>
                <div className="text-[10px] text-slate-400">Energia wiatrowa</div>
              </div>
            </div>

            {/* Pasek zakładek */}
            <div className="flex gap-1 rounded-xl bg-white/5 p-1" role="tablist">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
                    activeTab === id
                      ? 'bg-white/15 text-slate-50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon size={13} strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Zawartość zakładki */}
          <div className="min-h-0 lg:flex-1 lg:overflow-hidden">
            <TurbineForm turbine={turbine} onChange={setTurbine} section={activeTab} />
          </div>

          {/* Kontakt / Zamówienie kalkulatora */}
          <div className="hidden shrink-0 pb-1 pl-1 lg:block">
            <a
              href="mailto:mariusz.kalmuk@gmail.com?subject=Zam%C3%B3wienie%20kalkulatora%20lub%20dashboardu"
              className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/60 text-slate-400 shadow-glass transition hover:border-brand-400/50 hover:bg-white/10 hover:text-brand-300"
              aria-label="Zamów kalkulator lub dashboard"
            >
              <Mail size={18} />

              {/* Tooltip */}
              <span className="pointer-events-none absolute left-12 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900/95 px-2.5 py-1.5 text-xs font-medium text-slate-200 opacity-0 shadow-glass backdrop-blur-xl transition-opacity duration-300 group-hover:opacity-100">
                Zamów kalkulator lub dashboard
              </span>
            </a>
          </div>
        </aside>

        {/* ══ DASHBOARD ══ */}
        <div className="flex min-h-0 flex-1 flex-col gap-3">

          {/* Pasek pogodowy */}
          <WeatherPanel
            current={current}
            loading={loading}
            error={error}
            hubWind={hubWind}
            densityFactor={densityFactor}
          />

          {/* Kafelki produkcji */}
          <ProductionEstimate
            current={current}
            forecast={forecast}
            turbine={turbine}
            densityFactor={densityFactor}
          />

          {/* Wykresy — na wąskich ekranach jeden pod drugim, na szerokich obok siebie.
              Poniżej `lg` karty dostają konkretną wysokość: strona się wtedy przewija,
              a `flex-1` w kontenerze bez ustalonej wysokości dawał wykresom 0 px. */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">

            <GlassCard className="isolate flex h-72 transform-gpu flex-col p-4 lg:h-auto lg:min-h-0 lg:flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Krzywa mocy turbiny
                </h3>
                {operatingPoint && (
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                    {operatingPoint.speed} m/s → {Math.round(operatingPoint.power)} kW
                  </span>
                )}
              </div>
              <div className="min-h-0 flex-1">
                <PowerCurveChart curve={turbine.powerCurve} operatingPoint={operatingPoint} />
              </div>
            </GlassCard>

            <GlassCard className="isolate flex h-72 transform-gpu flex-col p-4 lg:h-auto lg:min-h-0 lg:flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Prognoza produkcji (5 dni)
                </h3>
              </div>
              <div className="min-h-0 flex-1">
                <ForecastChart forecast={forecast} turbine={turbine} densityFactor={densityFactor} />
              </div>
            </GlassCard>

          </div>
        </div>
      </div>
    </div>
  )
}
