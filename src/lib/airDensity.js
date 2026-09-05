// Korekta gęstości powietrza — wpływa na moc turbiny (P ∝ ρ).
// Krzywe mocy producentów podawane są dla warunków standardowych ρ0 = 1.225 kg/m³.

export const RHO_STANDARD = 1.225 // kg/m³ (15 °C, 1013.25 hPa, poziom morza)
const R_SPECIFIC = 287.05 // J/(kg·K) — stała gazowa dla suchego powietrza

/**
 * Gęstość powietrza z równania stanu gazu doskonałego: ρ = p / (R · T).
 * @param {number} tempC      temperatura [°C]
 * @param {number} pressurehPa ciśnienie [hPa]
 * @returns {number} gęstość [kg/m³]
 */
export function airDensity(tempC, pressurehPa) {
  if (!Number.isFinite(tempC) || !Number.isFinite(pressurehPa)) return RHO_STANDARD
  const T = tempC + 273.15 // K
  const p = pressurehPa * 100 // Pa
  if (T <= 0) return RHO_STANDARD
  return p / (R_SPECIFIC * T)
}

/**
 * Współczynnik korekty mocy względem warunków standardowych.
 * Moc skaluje się liniowo z gęstością: P = P_curve · (ρ / ρ0).
 * @returns {number} np. 1.04 dla zimnego/gęstego powietrza
 */
export function densityCorrectionFactor(tempC, pressurehPa) {
  return airDensity(tempC, pressurehPa) / RHO_STANDARD
}
