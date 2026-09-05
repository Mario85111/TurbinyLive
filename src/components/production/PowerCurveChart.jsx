import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts'

// Wykres krzywej mocy — wypełnia kontener rodzica (nie ma stałej wysokości).
export default function PowerCurveChart({ curve, operatingPoint }) {
  const data = (Array.isArray(curve) ? curve : [])
    .filter((p) => p && Number.isFinite(p.speed) && Number.isFinite(p.power))
    .sort((a, b) => a.speed - b.speed)

  if (data.length === 0) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-xs text-slate-400">
        Krzywa mocy jest pusta — dodaj punkty w zakładce „Krzywa”
        <br />
        albo przywróć preset przyciskiem „Reset”.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 16, left: -12 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.07)" />
        <XAxis
          dataKey="speed"
          type="number"
          domain={['dataMin', 'dataMax']}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          label={{
            value: 'prędkość wiatru [m/s]',
            position: 'insideBottom',
            offset: -8,
            fill: '#64748b',
            fontSize: 10,
          }}
        />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <Tooltip
          contentStyle={{
            background: 'rgba(8,20,40,0.92)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            color: '#e2e8f0',
            fontSize: 12,
          }}
          formatter={(v) => [`${Math.round(v)} kW`, 'Moc']}
          labelFormatter={(l) => `${l} m/s`}
        />
        <Line
          type="monotone"
          dataKey="power"
          stroke="#22d3ee"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
        {operatingPoint && Number.isFinite(operatingPoint.power) && (
          <ReferenceDot
            x={operatingPoint.speed}
            y={operatingPoint.power}
            r={6}
            fill="#f59e0b"
            stroke="#fff"
            strokeWidth={1.5}
            isFront
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
