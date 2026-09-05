import { describe, it, expect } from 'vitest'
import {
  extrapolateWind,
  powerAt,
  forecastPowerSeries,
  averagePowerFromForecast,
  aepFromAveragePower,
  capacityFactor,
} from './energy'
import { airDensity, densityCorrectionFactor, RHO_STANDARD } from './airDensity'
import { normalizeTurbine, normalizeLocation } from './schema'
import { TURBINE_PRESETS, turbineFromPreset } from '../data/turbinePresets'

const turbine = turbineFromPreset(TURBINE_PRESETS[0]) // Vestas V90, 2000 kW, cut-in 4, cut-out 25

describe('extrapolateWind', () => {
  it('stosuje prawo potęgowe Hellmanna', () => {
    // 8 m/s @10 m → 95 m przy α=0.14  ⇒  8 · 9.5^0.14
    expect(extrapolateWind(8, 95, 0.14)).toBeCloseTo(8 * Math.pow(9.5, 0.14), 6)
  })

  it('nie zmienia prędkości na wysokości odniesienia', () => {
    expect(extrapolateWind(7, 10, 0.2)).toBeCloseTo(7, 10)
  })

  it('zwraca 0 dla bezwietrznej i niepoprawnej wartości', () => {
    expect(extrapolateWind(0, 95, 0.14)).toBe(0)
    expect(extrapolateWind(NaN, 95, 0.14)).toBe(0)
  })

  it('przy braku wysokości piasty oddaje prędkość referencyjną', () => {
    expect(extrapolateWind(8, undefined, 0.14)).toBe(8)
  })
})

describe('powerAt', () => {
  it('interpoluje liniowo między punktami krzywej', () => {
    // 10 m/s → 1730 kW, 11 m/s → 1905 kW, więc 10.5 to dokładnie środek
    expect(powerAt(10.5, turbine.powerCurve, { cutIn: 4, cutOut: 25 })).toBeCloseTo(1817.5, 6)
  })

  it('zeruje moc poniżej cut-in i powyżej cut-out', () => {
    expect(powerAt(3.9, turbine.powerCurve, { cutIn: 4, cutOut: 25 })).toBe(0)
    expect(powerAt(25.1, turbine.powerCurve, { cutIn: 4, cutOut: 25 })).toBe(0)
  })

  it('utrzymuje moc znamionową dokładnie na cut-out', () => {
    expect(powerAt(25, turbine.powerCurve, { cutIn: 4, cutOut: 25 })).toBe(2000)
  })

  it('skaluje moc liniowo korektą gęstości', () => {
    const base = powerAt(9, turbine.powerCurve, { cutIn: 4, cutOut: 25 })
    const dense = powerAt(9, turbine.powerCurve, { cutIn: 4, cutOut: 25, densityFactor: 1.1 })
    expect(dense).toBeCloseTo(base * 1.1, 6)
  })

  it('nie wywraca się na pustej ani uszkodzonej krzywej', () => {
    expect(powerAt(10, [])).toBe(0)
    expect(powerAt(10, undefined)).toBe(0)
    expect(powerAt(10, [{ speed: 'x', power: null }])).toBe(0)
  })
})

describe('airDensity', () => {
  it('odtwarza gęstość standardową dla warunków normalnych', () => {
    expect(airDensity(15, 1013.25)).toBeCloseTo(RHO_STANDARD, 2)
  })

  it('daje korektę powyżej 1 dla zimnego, gęstego powietrza', () => {
    expect(densityCorrectionFactor(-10, 1030)).toBeGreaterThan(1)
  })

  it('daje korektę poniżej 1 dla ciepłego, rzadkiego powietrza', () => {
    expect(densityCorrectionFactor(30, 990)).toBeLessThan(1)
  })
})

describe('forecastPowerSeries', () => {
  const forecast = [
    { time: 0, windSpeed: 8, temp: -10, pressure: 1030 },
    { time: 10_800_000, windSpeed: 8, temp: 30, pressure: 990 },
  ]

  it('liczy korektę gęstości osobno dla każdego kroku prognozy', () => {
    const [zimny, cieply] = forecastPowerSeries(forecast, turbine)
    expect(zimny.powerKW).toBeGreaterThan(cieply.powerKW)
  })

  it('używa korekty zapasowej, gdy krok nie ma temperatury i ciśnienia', () => {
    const [krok] = forecastPowerSeries([{ time: 0, windSpeed: 8 }], turbine, {
      fallbackDensityFactor: 2,
    })
    const [bazowy] = forecastPowerSeries([{ time: 0, windSpeed: 8 }], turbine)
    expect(krok.powerKW).toBeCloseTo(bazowy.powerKW * 2, 6)
  })

  it('zwraca pustą tablicę dla braku danych', () => {
    expect(forecastPowerSeries([], turbine)).toEqual([])
    expect(forecastPowerSeries(undefined, turbine)).toEqual([])
  })
})

describe('spójność produkcji dobowej i rocznej', () => {
  // Regresja: gdy krzywa mocy przekracza moc znamionową, CF jest przycinany do 1
  // i AEP liczony „z CF” rozjeżdżał się z produkcją dobową pokazywaną obok.
  const przewymiarowana = {
    ...turbine,
    ratedPowerKW: 1000, // celowo poniżej szczytu krzywej (2000 kW)
  }
  const forecast = Array.from({ length: 40 }, (_, i) => ({ time: i * 10_800_000, windSpeed: 14 }))

  it('roczna to dokładnie dobowa × 365', () => {
    const avg = averagePowerFromForecast(forecast, przewymiarowana)
    const dailyMWh = (avg * 24) / 1000
    const annualMWh = aepFromAveragePower(avg)
    expect(annualMWh).toBeCloseTo(dailyMWh * 365, 6)
  })

  it('CF jest nadal przycinany do 0..1 jako wskaźnik prezentacyjny', () => {
    const avg = averagePowerFromForecast(forecast, przewymiarowana)
    expect(capacityFactor(avg, przewymiarowana.ratedPowerKW)).toBe(1)
    expect(capacityFactor(500, 0)).toBe(0)
  })
})

describe('normalizeTurbine', () => {
  it('uzupełnia brakującą krzywą mocy z presetu zamiast wywalać aplikację', () => {
    // Regresja: taki zapis w localStorage dawał biały ekran (curve is not iterable).
    const wynik = normalizeTurbine({ presetId: 'vestas-v90-2000', ratedPowerKW: 2000 })
    expect(Array.isArray(wynik.powerCurve)).toBe(true)
    expect(wynik.powerCurve.length).toBeGreaterThan(0)
  })

  it('odrzuca kompletnie nieprawidłowy zapis', () => {
    for (const zly of [null, undefined, 'tekst', 42, []]) {
      expect(normalizeTurbine(zly).powerCurve.length).toBeGreaterThan(0)
    }
  })

  it('czyści śmieci z krzywej i sortuje ją rosnąco', () => {
    const wynik = normalizeTurbine({
      presetId: 'vestas-v90-2000',
      powerCurve: [{ speed: 9, power: 100 }, null, { speed: 'x', power: 1 }, { speed: 4, power: 10 }],
    })
    expect(wynik.powerCurve).toEqual([
      { speed: 4, power: 10 },
      { speed: 9, power: 100 },
    ])
  })

  it('przycina liczby do dopuszczalnych zakresów', () => {
    const wynik = normalizeTurbine({
      presetId: 'vestas-v90-2000',
      turbineCount: -5,
      terrainAlpha: 9,
      hubHeight: 0,
    })
    expect(wynik.turbineCount).toBe(1)
    expect(wynik.terrainAlpha).toBe(1)
    expect(wynik.hubHeight).toBe(1)
  })

  it('podmienia puste pola formularza na wartości z presetu', () => {
    const wynik = normalizeTurbine({ presetId: 'vestas-v90-2000', cutIn: '', hubHeight: '' })
    expect(wynik.cutIn).toBe(4)
    expect(wynik.hubHeight).toBe(95)
  })
})

describe('normalizeLocation', () => {
  const fallback = { name: 'Gdańsk, PL', lat: 54.352, lon: 18.6466 }

  it('przepuszcza poprawne współrzędne', () => {
    expect(normalizeLocation({ name: 'Oslo', lat: 59.9, lon: 10.7 }, fallback)).toEqual({
      name: 'Oslo',
      lat: 59.9,
      lon: 10.7,
    })
  })

  it('odrzuca współrzędne spoza zakresu i śmieci', () => {
    expect(normalizeLocation({ lat: 200, lon: 0 }, fallback)).toBe(fallback)
    expect(normalizeLocation({ lat: 'abc', lon: 0 }, fallback)).toBe(fallback)
    expect(normalizeLocation(null, fallback)).toBe(fallback)
  })
})
