// Logika szacowania produkcji energii z turbiny wiatrowej (model krzywej mocy).

import { densityCorrectionFactor } from './airDensity'

const HOURS_PER_YEAR = 8760

/**
 * Ekstrapolacja prędkości wiatru z wysokości pomiaru na wysokość piasty.
 * Prawo potęgowe (Hellmanna): v(h) = v_ref · (h / h_ref)^α.
 * OpenWeatherMap podaje wiatr na ~10 m, a piasty turbin lądowych mają ~80–120 m,
 * więc ten krok ma duży wpływ na wynik.
 *
 * @param {number} vRef     prędkość na wysokości odniesienia [m/s]
 * @param {number} hubHeight wysokość piasty [m]
 * @param {number} alpha     wykładnik szorstkości terenu (0.10 otwarty … 0.30 zabudowa)
 * @param {number} refHeight wysokość pomiaru [m] (domyślnie 10)
 * @returns {number} prędkość na wysokości piasty [m/s]
 */
export function extrapolateWind(vRef, hubHeight, alpha = 0.14, refHeight = 10) {
  if (!Number.isFinite(vRef) || vRef <= 0) return 0
  if (!Number.isFinite(hubHeight) || hubHeight <= 0) return vRef
  const a = Number.isFinite(alpha) ? alpha : 0.14
  return vRef * Math.pow(hubHeight / refHeight, a)
}

/**
 * Moc turbiny dla zadanej prędkości wiatru — interpolacja liniowa po krzywej mocy.
 * Poniżej cut-in oraz powyżej cut-out moc = 0.
 *
 * @param {number} windSpeed prędkość wiatru na piaście [m/s]
 * @param {{speed:number, power:number}[]} curve punkty krzywej mocy (posortowane rosnąco po speed)
 * @param {{cutIn?:number, cutOut?:number, densityFactor?:number}} [opts]
 * @returns {number} moc [kW]
 */
export function powerAt(windSpeed, curve, opts = {}) {
  const { cutIn, cutOut, densityFactor = 1 } = opts
  if (!Number.isFinite(windSpeed) || !Array.isArray(curve) || curve.length === 0) return 0

  const rho = Number.isFinite(densityFactor) ? densityFactor : 1

  const pts = [...curve]
    .filter((p) => p && Number.isFinite(p.speed) && Number.isFinite(p.power))
    .sort((a, b) => a.speed - b.speed)
  if (pts.length === 0) return 0

  if (Number.isFinite(cutIn) && windSpeed < cutIn) return 0
  if (Number.isFinite(cutOut) && windSpeed > cutOut) return 0

  // Poza zakresem krzywej: przytnij do skrajnych wartości.
  if (windSpeed <= pts[0].speed) return clamp0(pts[0].power * rho)
  if (windSpeed >= pts[pts.length - 1].speed) {
    return clamp0(pts[pts.length - 1].power * rho)
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if (windSpeed >= a.speed && windSpeed <= b.speed) {
      const t = (windSpeed - a.speed) / (b.speed - a.speed)
      return clamp0((a.power + t * (b.power - a.power)) * rho)
    }
  }
  return 0
}

/**
 * Roczna produkcja energii (AEP) wprost ze średniej mocy.
 *
 * Uwaga: świadomie NIE liczymy tego przez capacity factor. CF jest przycinany do
 * przedziału 0..1, więc gdy krzywa mocy przekracza zadeklarowaną moc znamionową
 * (np. po ręcznej edycji krzywej albo obniżeniu mocy znamionowej), AEP liczony
 * „z CF” rozjeżdżał się z produkcją dobową pokazywaną obok.
 *
 * @param {number} avgPowerKW średnia moc [kW]
 * @returns {number} AEP [MWh/rok]
 */
export function aepFromAveragePower(avgPowerKW) {
  return (Math.max(0, avgPowerKW) * HOURS_PER_YEAR) / 1000
}

/** Współczynnik wykorzystania mocy = moc średnia / moc znamionowa (0..1). */
export function capacityFactor(avgPowerKW, ratedKW) {
  if (!Number.isFinite(ratedKW) || ratedKW <= 0) return 0
  return clamp01(avgPowerKW / ratedKW)
}

/**
 * Szereg mocy jednej turbiny policzony po prognozie.
 * Dla każdego kroku ekstrapoluje wiatr na piastę, wyznacza korektę gęstości
 * z temperatury i ciśnienia TEGO kroku i odczytuje moc z krzywej.
 *
 * Jedno źródło prawdy dla wykresu prognozy i dla kafelków produkcji —
 * dzięki temu nie mogą się rozjechać.
 *
 * @param {{time:number, windSpeed:number, temp?:number, pressure?:number}[]} forecast
 * @param {object} turbine parametry turbiny (hubHeight, terrainAlpha, powerCurve, cutIn, cutOut)
 * @param {{fallbackDensityFactor?:number}} [opts] korekta używana, gdy krok nie ma temp/ciśnienia
 * @returns {{time:number, hubWind:number, powerKW:number}[]}
 */
export function forecastPowerSeries(forecast, turbine, opts = {}) {
  if (!Array.isArray(forecast) || forecast.length === 0) return []
  const { fallbackDensityFactor = 1 } = opts

  return forecast.map((f) => {
    const hubWind = extrapolateWind(f.windSpeed, turbine.hubHeight, turbine.terrainAlpha)
    const densityFactor =
      Number.isFinite(f.temp) && Number.isFinite(f.pressure)
        ? densityCorrectionFactor(f.temp, f.pressure)
        : fallbackDensityFactor
    const powerKW = powerAt(hubWind, turbine.powerCurve, {
      cutIn: turbine.cutIn,
      cutOut: turbine.cutOut,
      densityFactor,
    })
    return { time: f.time, hubWind, powerKW }
  })
}

/**
 * Średnia moc jednej turbiny [kW] policzona po szeregu prognozy.
 * To podstawa realistycznego szacunku produkcji (zamiast stałego, bieżącego wiatru).
 *
 * @returns {number|null} średnia moc [kW] lub null, gdy brak danych
 */
export function averagePowerFromForecast(forecast, turbine, opts = {}) {
  const series = forecastPowerSeries(forecast, turbine, opts)
  if (series.length === 0) return null
  return series.reduce((acc, s) => acc + s.powerKW, 0) / series.length
}

function clamp0(x) {
  return x < 0 ? 0 : x
}
function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  return Math.min(1, Math.max(0, x))
}

export { HOURS_PER_YEAR }
