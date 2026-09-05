// Kafelek pojedynczej statystyki: ikona + etykieta + wartość + jednostka.
export default function StatTile({ icon: Icon, label, value, unit, accent = 'text-brand-300', hint }) {
  return (
    <div className="glass flex items-center gap-4 p-4">
      {Icon && (
        <div className={`rounded-xl bg-white/10 p-2.5 ${accent}`}>
          <Icon size={22} strokeWidth={1.8} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="truncate text-xl font-semibold text-slate-50">{value}</span>
          {unit && <span className="text-sm text-slate-400">{unit}</span>}
        </div>
        {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
      </div>
    </div>
  )
}
