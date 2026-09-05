import { useState } from 'react'
import { Settings2, SlidersHorizontal, TrendingUp, RotateCcw } from 'lucide-react'
import { TURBINE_PRESETS, turbineFromPreset } from '../../data/turbinePresets'
import PowerCurveEditor from './PowerCurveEditor'

/**
 * Pole liczbowe, które pozwala na pusty stan podczas pisania, ale nigdy nie
 * zostawia go w modelu. Puste lub wykraczające poza zakres pole wraca przy
 * opuszczeniu do wartości dopuszczalnej — wcześniej wyczyszczenie np. „Cut-in”
 * po cichu wyłączało zabezpieczenie w obliczeniach.
 */
function NumberField({ label, unit, value, onChange, step = 1, min, max }) {
  // `null` znaczy „pokazuj wartość z modelu”. Dzięki temu zmiana z zewnątrz
  // (preset, reset) jest widoczna natychmiast, bez synchronizacji przez useEffect.
  const [draft, setDraft] = useState(null)
  const shown = draft ?? String(value ?? '')

  function commit() {
    if (draft === null) return
    const parsed = Number(draft.replace(',', '.'))
    setDraft(null)
    if (draft.trim() === '' || !Number.isFinite(parsed)) return
    let next = parsed
    if (Number.isFinite(min)) next = Math.max(min, next)
    if (Number.isFinite(max)) next = Math.min(max, next)
    if (next !== value) onChange(next)
  }

  return (
    <label className="block">
      <span className="glass-label">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          className={`glass-input ${unit ? 'pr-10' : ''}`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {unit}
          </span>
        )}
      </div>
    </label>
  )
}

function SectionHeader({ icon: Icon, title, onReset }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Icon size={15} className="text-brand-300" /> {title}
      </h3>
      <button
        type="button"
        onClick={onReset}
        className="glass-btn px-2.5 py-1 text-xs"
        title="Przywróć wartości presetu"
      >
        <RotateCcw size={13} /> Reset
      </button>
    </div>
  )
}

// Formularz turbiny podzielony na 3 zakładki: 'turbina' | 'praca' | 'krzywa'.
export default function TurbineForm({ turbine, onChange, section }) {
  function set(field, value) {
    onChange({ ...turbine, [field]: value })
  }

  function applyPreset(id) {
    const preset = TURBINE_PRESETS.find((p) => p.id === id)
    if (preset) onChange(turbineFromPreset(preset))
  }

  const resetToPreset = () => applyPreset(turbine.presetId)

  /* ── Zakładka: parametry turbiny ── */
  if (section === 'turbina') {
    return (
      <div className="glass space-y-4 p-5">
        <SectionHeader icon={Settings2} title="Parametry turbiny" onReset={resetToPreset} />

        <label className="block">
          <span className="glass-label">Model (preset)</span>
          <select
            value={turbine.presetId}
            onChange={(e) => applyPreset(e.target.value)}
            className="glass-input"
          >
            {TURBINE_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-800">
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Moc znamionowa"
            unit="kW"
            value={turbine.ratedPowerKW}
            onChange={(v) => set('ratedPowerKW', v)}
            step={50}
            min={0}
            max={50000}
          />
          <NumberField
            label="Średnica wirnika"
            unit="m"
            value={turbine.rotorDiameter}
            onChange={(v) => set('rotorDiameter', v)}
            min={1}
            max={400}
          />
          <NumberField
            label="Wysokość piasty"
            unit="m"
            value={turbine.hubHeight}
            onChange={(v) => set('hubHeight', v)}
            min={1}
            max={300}
          />
          <NumberField
            label="Liczba turbin"
            value={turbine.turbineCount}
            onChange={(v) => set('turbineCount', Math.round(v))}
            min={1}
            max={1000}
          />
        </div>
      </div>
    )
  }

  /* ── Zakładka: parametry pracy ── */
  if (section === 'praca') {
    return (
      <div className="glass space-y-4 p-5">
        <SectionHeader icon={SlidersHorizontal} title="Parametry pracy" onReset={resetToPreset} />

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Cut-in"
            unit="m/s"
            value={turbine.cutIn}
            onChange={(v) => set('cutIn', v)}
            step={0.5}
            min={0}
            max={30}
          />
          <NumberField
            label="Cut-out"
            unit="m/s"
            value={turbine.cutOut}
            onChange={(v) => set('cutOut', v)}
            step={0.5}
            min={1}
            max={60}
          />
        </div>

        <NumberField
          label="Wykładnik terenu α"
          value={turbine.terrainAlpha}
          onChange={(v) => set('terrainAlpha', v)}
          step={0.01}
          min={0}
          max={1}
        />

        {turbine.cutOut <= turbine.cutIn && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            Cut-out musi być większy od cut-in — przy tych wartościach turbina nigdy nie pracuje.
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-slate-500">
          α: ~0.10 teren otwarty (woda, równina) · ~0.14 obszary rolnicze · ~0.20–0.30 zabudowa/las.
          <br />
          Prędkość jest ekstrapolowana z 10 m (pomiar OWM) na wysokość piasty.
        </p>
      </div>
    )
  }

  /* ── Zakładka: krzywa mocy ── */
  return (
    <div className="glass flex h-full flex-col gap-3 p-5">
      <SectionHeader icon={TrendingUp} title="Krzywa mocy" onReset={resetToPreset} />
      <PowerCurveEditor curve={turbine.powerCurve} onChange={(c) => set('powerCurve', c)} fill />
      <p className="shrink-0 text-[11px] text-slate-500">
        Krzywe producentów dla ρ₀ = 1.225 kg/m³. Aplikacja koryguje moc o bieżącą gęstość powietrza.
      </p>
    </div>
  )
}
