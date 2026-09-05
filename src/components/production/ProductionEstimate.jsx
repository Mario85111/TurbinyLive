import { useMemo } from 'react'
import { Zap, CalendarDays, TrendingUp, Activity } from 'lucide-react'
import StatTile from '../ui/StatTile'
import {
  extrapolateWind,
  powerAt,
  forecastPowerSeries,
  aepFromAveragePower,
  capacityFactor,
} from '../../lib/energy'

// Rząd kafelków produkcji energii.
// Moc chwilowa liczona z bieżącego wiatru; produkcja dobowa/roczna i capacity factor
// liczone ze ŚREDNIEJ mocy z prognozy 5-dniowej (realistyczny szacunek, nie stały wiatr).
export default function ProductionEstimate({ current, forecast, turbine, densityFactor = 1 }) {
  const count = Math.max(1, Number(turbine.turbineCount) || 1)
  const rated = Number(turbine.ratedPowerKW) || 0

  // ── Moc chwilowa (z aktualnego wiatru) ──
  const v10 = current?.wind?.speed ?? null
  const hubWind =
    v10 != null ? extrapolateWind(v10, turbine.hubHeight, turbine.terrainAlpha) : null
  const powerPerTurbine =
    hubWind != null
      ? powerAt(hubWind, turbine.powerCurve, {
          cutIn: turbine.cutIn,
          cutOut: turbine.cutOut,
          densityFactor,
        })
      : 0
  const farmPowerKW = powerPerTurbine * count

  // ── Szacunki z prognozy ──
  // Dobowa i roczna liczone z tej samej średniej mocy, więc nie mogą się rozjechać.
  // CF jest tu wyłącznie wskaźnikiem prezentacyjnym (przycinanym do 0..1).
  const { avgPower, cf, dailyMWh, annualMWh, days } = useMemo(() => {
    const series = forecastPowerSeries(forecast, turbine, {
      fallbackDensityFactor: densityFactor,
    })
    if (series.length === 0) {
      return { avgPower: null, cf: null, dailyMWh: null, annualMWh: null, days: 0 }
    }
    const avg = series.reduce((acc, s) => acc + s.powerKW, 0) / series.length
    const span = series[series.length - 1].time - series[0].time
    return {
      avgPower: avg,
      cf: capacityFactor(avg, rated),
      dailyMWh: (avg * count * 24) / 1000,
      annualMWh: aepFromAveragePower(avg) * count,
      days: Math.max(1, Math.round(span / 86_400_000)),
    }
  }, [forecast, turbine, densityFactor, rated, count])

  const fmt = (n, d = 0) =>
    Number.isFinite(n)
      ? n.toLocaleString('pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d })
      : '—'

  if (!current) {
    return (
      <div className="glass px-4 py-3 text-center text-xs text-slate-400">
        Wybierz lokalizację, aby obliczyć produkcję.
      </div>
    )
  }

  const forecastHint = avgPower != null ? `prognoza ${days} dni` : 'brak prognozy'

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        icon={Activity}
        label="Moc chwilowa (farma)"
        value={farmPowerKW >= 1000 ? fmt(farmPowerKW / 1000, 2) : fmt(farmPowerKW)}
        unit={farmPowerKW >= 1000 ? 'MW' : 'kW'}
        accent="text-amber-300"
        hint={count > 1 ? `1 turbina: ${fmt(powerPerTurbine)} kW` : 'bieżący wiatr'}
      />
      <StatTile
        icon={TrendingUp}
        label="Wsp. wykorzystania"
        value={cf != null ? fmt(cf * 100, 0) : '—'}
        unit="%"
        accent="text-emerald-300"
        hint={forecastHint}
      />
      <StatTile
        icon={CalendarDays}
        label="Produkcja / dobę"
        value={dailyMWh != null ? fmt(dailyMWh, 1) : '—'}
        unit="MWh"
        accent="text-sky-300"
        hint={forecastHint}
      />
      <StatTile
        icon={Zap}
        label="Produkcja / rok"
        value={annualMWh != null ? fmt(annualMWh, 0) : '—'}
        unit="MWh"
        accent="text-violet-300"
        hint="ekstrapolacja z prognozy — bez sezonowości"
      />
    </div>
  )
}
