// Presety komercyjnych, lądowych turbin wiatrowych.
// Krzywe mocy są zaokrąglonymi wartościami przybliżonymi (dane producentów dla ρ0 = 1.225 kg/m³),
// przeznaczonymi do szacunków. Do obliczeń wiążących użyj oficjalnych kart katalogowych.

/**
 * @typedef {Object} TurbinePreset
 * @property {string} id
 * @property {string} name
 * @property {number} ratedPowerKW   moc znamionowa [kW]
 * @property {number} rotorDiameter  średnica wirnika [m]
 * @property {number} hubHeight      typowa wysokość piasty [m]
 * @property {number} cutIn          prędkość startowa [m/s]
 * @property {number} cutOut         prędkość wyłączenia [m/s]
 * @property {{speed:number, power:number}[]} powerCurve  krok 1 m/s
 */

/** @type {TurbinePreset[]} */
export const TURBINE_PRESETS = [
  {
    id: 'vestas-v90-2000',
    name: 'Vestas V90 — 2.0 MW',
    ratedPowerKW: 2000,
    rotorDiameter: 90,
    hubHeight: 95,
    cutIn: 4,
    cutOut: 25,
    powerCurve: [
      { speed: 3, power: 0 },
      { speed: 4, power: 75 },
      { speed: 5, power: 195 },
      { speed: 6, power: 380 },
      { speed: 7, power: 645 },
      { speed: 8, power: 980 },
      { speed: 9, power: 1390 },
      { speed: 10, power: 1730 },
      { speed: 11, power: 1905 },
      { speed: 12, power: 1980 },
      { speed: 13, power: 2000 },
      { speed: 14, power: 2000 },
      { speed: 20, power: 2000 },
      { speed: 25, power: 2000 },
    ],
  },
  {
    id: 'enercon-e82-2300',
    name: 'Enercon E-82 E2 — 2.3 MW',
    ratedPowerKW: 2300,
    rotorDiameter: 82,
    hubHeight: 98,
    cutIn: 3,
    cutOut: 28,
    powerCurve: [
      { speed: 2, power: 0 },
      { speed: 3, power: 25 },
      { speed: 4, power: 82 },
      { speed: 5, power: 174 },
      { speed: 6, power: 321 },
      { speed: 7, power: 532 },
      { speed: 8, power: 815 },
      { speed: 9, power: 1180 },
      { speed: 10, power: 1580 },
      { speed: 11, power: 1900 },
      { speed: 12, power: 2200 },
      { speed: 13, power: 2300 },
      { speed: 14, power: 2300 },
      { speed: 20, power: 2300 },
      { speed: 28, power: 2300 },
    ],
  },
  {
    id: 'ge-15-77',
    name: 'GE 1.5sle — 1.5 MW',
    ratedPowerKW: 1500,
    rotorDiameter: 77,
    hubHeight: 80,
    cutIn: 3.5,
    cutOut: 25,
    powerCurve: [
      { speed: 3, power: 0 },
      { speed: 4, power: 35 },
      { speed: 5, power: 120 },
      { speed: 6, power: 250 },
      { speed: 7, power: 430 },
      { speed: 8, power: 660 },
      { speed: 9, power: 940 },
      { speed: 10, power: 1200 },
      { speed: 11, power: 1390 },
      { speed: 12, power: 1470 },
      { speed: 13, power: 1500 },
      { speed: 14, power: 1500 },
      { speed: 20, power: 1500 },
      { speed: 25, power: 1500 },
    ],
  },
  {
    id: 'siemens-gamesa-sg-3400',
    name: 'Siemens Gamesa SG 3.4-132 — 3.4 MW',
    ratedPowerKW: 3400,
    rotorDiameter: 132,
    hubHeight: 114,
    cutIn: 3,
    cutOut: 25,
    powerCurve: [
      { speed: 3, power: 35 },
      { speed: 4, power: 175 },
      { speed: 5, power: 415 },
      { speed: 6, power: 770 },
      { speed: 7, power: 1260 },
      { speed: 8, power: 1900 },
      { speed: 9, power: 2620 },
      { speed: 10, power: 3120 },
      { speed: 11, power: 3360 },
      { speed: 12, power: 3400 },
      { speed: 13, power: 3400 },
      { speed: 14, power: 3400 },
      { speed: 20, power: 3400 },
      { speed: 25, power: 3400 },
    ],
  },
]

/** Domyślny preset użyty przy pierwszym uruchomieniu. */
export const DEFAULT_TURBINE = TURBINE_PRESETS[0]

/** Pełny obiekt parametrów turbiny pochodzący z presetu (kopia do edycji). */
export function turbineFromPreset(preset) {
  return {
    presetId: preset.id,
    name: preset.name,
    ratedPowerKW: preset.ratedPowerKW,
    rotorDiameter: preset.rotorDiameter,
    hubHeight: preset.hubHeight,
    cutIn: preset.cutIn,
    cutOut: preset.cutOut,
    turbineCount: 1,
    terrainAlpha: 0.14,
    powerCurve: preset.powerCurve.map((p) => ({ ...p })),
  }
}
