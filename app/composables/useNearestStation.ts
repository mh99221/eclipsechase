/**
 * Resolves the nearest weather station to a given lat/lng, used by the
 * spot detail Weather tab to pick which station's observations + forecast
 * to show. Same cosine-scaled squared-Euclidean distance pattern as
 * server/utils/eclipseGrid.ts (`nearestGridPoint`) and the inline loop in
 * useRecommendation — extracted here so the forecast cards don't reinvent
 * it.
 *
 * Stations come from /api/weather/stations (server caches in memory; this
 * composable also keys the client-side useFetch with 'weather-stations' so
 * multiple consumers share the response).
 */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

export interface WeatherStation {
  id: string
  name: string
  lat: number
  lng: number
  region: string | null
}

export function useNearestStation(
  lat: MaybeRefOrGetter<number | null | undefined>,
  lng: MaybeRefOrGetter<number | null | undefined>,
) {
  const { data, pending } = useFetch<{ stations: WeatherStation[] }>(
    '/api/weather/stations',
    { lazy: true, server: false, key: 'weather-stations' },
  )

  const nearest = computed<WeatherStation | null>(() => {
    const stations = data.value?.stations
    const _lat = toValue(lat)
    const _lng = toValue(lng)
    if (!stations || _lat == null || _lng == null) return null

    // cos-scale longitude so the metric reflects ground distance at this
    // latitude — without it, 1° lng counts the same as 1° lat which is
    // wildly wrong at Iceland's ~65° N (lng spacing is ~42% of lat there).
    const cosLat = Math.cos((_lat * Math.PI) / 180)
    let best: WeatherStation | null = null
    let bestDist = Number.POSITIVE_INFINITY
    for (const s of stations) {
      const dLat = s.lat - _lat
      const dLng = (s.lng - _lng) * cosLat
      const d = dLat * dLat + dLng * dLng
      if (d < bestDist) {
        bestDist = d
        best = s
      }
    }
    return best
  })

  return { nearest, pending }
}
