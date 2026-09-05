import { Plus, Trash2 } from 'lucide-react'

// Edytowalna tabela krzywej mocy.
// fill=true → tabela rozciąga się na dostępną wysokość rodzica (zakładka "Krzywa").
export default function PowerCurveEditor({ curve, onChange, fill = false }) {
  const rows = Array.isArray(curve) ? curve : []

  function update(index, field, raw) {
    const num = raw === '' ? '' : Number(raw)
    onChange(rows.map((p, i) => (i === index ? { ...p, [field]: num } : p)))
  }

  // Puste pole nie może zostać w modelu — obliczenia i tak by je odrzuciły,
  // więc przy opuszczeniu wracamy do 0.
  function commit(index, field, raw) {
    const num = Number(String(raw).replace(',', '.'))
    const safe = Number.isFinite(num) ? Math.max(0, num) : 0
    onChange(rows.map((p, i) => (i === index ? { ...p, [field]: safe } : p)))
  }

  function addRow() {
    const last = rows[rows.length - 1]
    const lastSpeed = Number(last?.speed)
    onChange([...rows, { speed: Number.isFinite(lastSpeed) ? lastSpeed + 1 : 0, power: 0 }])
  }

  function removeRow(index) {
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className={fill ? 'flex min-h-0 flex-1 flex-col gap-2' : 'flex flex-col gap-2'}>
      <div className="flex shrink-0 items-center justify-between">
        <span className="glass-label mb-0">Punkty ({rows.length})</span>
        <button type="button" onClick={addRow} className="glass-btn px-2.5 py-1 text-xs">
          <Plus size={14} /> Punkt
        </button>
      </div>

      <div
        className={`rounded-xl border border-white/10 ${
          fill ? 'max-h-72 min-h-0 overflow-y-auto lg:max-h-none lg:flex-1' : 'max-h-56 overflow-y-auto'
        }`}
      >
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-slate-400">
            Brak punktów — dodaj je przyciskiem „Punkt”
            <br />
            albo przywróć krzywą presetu przyciskiem „Reset”.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/10 text-xs text-slate-300 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-medium">v [m/s]</th>
                <th className="px-3 py-2 text-left font-medium">P [kW]</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      value={p.speed}
                      onChange={(e) => update(i, 'speed', e.target.value)}
                      onBlur={(e) => commit(i, 'speed', e.target.value)}
                      aria-label={`Prędkość wiatru, punkt ${i + 1}`}
                      className="glass-input px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="10"
                      min="0"
                      value={p.power}
                      onChange={(e) => update(i, 'power', e.target.value)}
                      onBlur={(e) => commit(i, 'power', e.target.value)}
                      aria-label={`Moc, punkt ${i + 1}`}
                      className="glass-input px-2 py-1"
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="rounded-md p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                      aria-label={`Usuń punkt ${i + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
