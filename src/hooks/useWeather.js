import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentWeather, getForecast, WeatherError } from '../api/weather'

// OpenWeatherMap odświeża pomiary w takcie ~10 min — częstsze odpytywanie
// tylko zużywałoby limit zapytań, nie dając nowych danych.
const REFRESH_INTERVAL_MS = 10 * 60 * 1000

/**
 * Pobiera aktualną pogodę i prognozę dla podanej lokalizacji {lat, lon}.
 * Dane odświeżają się same co 10 minut oraz po powrocie do karty przeglądarki —
 * dashboard zostawiony na monitorze nie pokazuje wczorajszego wiatru.
 *
 * Zwraca stan ładowania/błędu, moment ostatniego udanego pobrania
 * oraz funkcję ręcznego odświeżania.
 */
export function useWeather(location) {
  const [current, setCurrent] = useState(null)
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const lat = location?.lat
  const lon = location?.lon

  // Odpowiedź, która wróciła po zmianie lokalizacji, nie może nadpisać nowszej.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (lat == null || lon == null) return
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const [cur, fc] = await Promise.all([getCurrentWeather(lat, lon), getForecast(lat, lon)])
      if (id !== requestId.current) return
      setCurrent(cur)
      setForecast(fc)
      setLastUpdated(Date.now())
    } catch (e) {
      if (id !== requestId.current) return
      setError(e instanceof WeatherError ? e : new WeatherError('Nieznany błąd pobierania danych.'))
      setCurrent(null)
      setForecast([])
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [lat, lon])

  useEffect(() => {
    // Pobranie danych z zewnętrznego API przy montowaniu i po zmianie lokalizacji.
    // Reguła protestuje, bo `load` ustawia synchronicznie stan ładowania — to celowe:
    // spinner ma się pojawić od razu, a właściwe dane przychodzą asynchronicznie.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // Cykliczne odświeżanie + dociągnięcie danych po powrocie do karty.
  useEffect(() => {
    if (lat == null || lon == null) return undefined

    const timer = setInterval(load, REFRESH_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load, lat, lon])

  return { current, forecast, loading, error, lastUpdated, refresh: load }
}
