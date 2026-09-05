import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { forecastPowerSeries } from '../../lib/energy'

const DATE_LABEL = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: 'numeric' })
const TIME_LABEL = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' })

// Prognoza mocy turbiny na cały horyzont z OWM (5 dni w krokach 3 h).
// Wypełnia kontener rodzica.
export default function ForecastChart({ forecast, turbine, densityFactor = 1 }) {
  const data = useMemo(() => {
    const count = Math.max(1, Number(turbine.turbineCount) || 1)
    return forecastPowerSeries(forecast, turbine, { fallbackDensityFactor: densityFactor }).map(
      (s) => {
        const d = new Date(s.time)
        return {
          time: s.time,
          // Na osi dzień (podpisy wypadają raz na dobę), pełna data z godziną
          // w tooltipie. Sam zapis „dzień + godzina” był nieczytelny, bo
          // powtarzał się co 24 h bez wskazania daty.
          label: DATE_LABEL.format(d),
          fullLabel: `${DATE_LABEL.format(d)}, ${TIME_LABEL.format(d)}`,
          wind: Number(s.hubWind.toFixed(1)),
          powerMW: Number(((s.powerKW * count) / 1000).toFixed(2)),
        }
      },
    )
  }, [forecast, turbine, densityFactor])

  if (data.length === 0) {
    return (
      <div className="grid h-full place-items-center text-xs text-slate-400">
        Brak danych prognozy.
      </div>
    )
  }

  // Podpisy muszą wypadać zawsze o tej samej godzinie, inaczej dryfują przez dobę.
  // Krok wyliczamy z rzeczywistego odstępu czasu (OWM daje 3 h), a nie z liczby punktów.
  const stepHours = data.length > 1 ? (data[1].time - data[0].time) / 3_600_000 : 3
  const perDay = stepHours > 0 ? Math.round(24 / stepHours) : 8
  const tickInterval = Math.max(0, perDay - 1)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 16, left: -12 }}>
        <defs>
          <linearGradient id="powerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={tickInterval} />
        <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <Tooltip
          contentStyle={{
            background: 'rgba(8,20,40,0.92)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            color: '#e2e8f0',
            fontSize: 12,
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="powerMW"
          name="Moc [MW]"
          stroke="#22d3ee"
          strokeWidth={2}
          fill="url(#powerFill)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="wind"
          name="Wiatr na piaście [m/s]"
          stroke="#f59e0b"
          strokeWidth={1.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
