/**
 * Client-side fetcher for the Open-Meteo proxy at /api/forecast/openmeteo.
 *
 * Two models served, corresponding to two phase cards on the spot detail
 * Weather tab:
 * - 'ifs_hres' — 16-day deterministic ECMWF IFS HRES, used by
 *   ForecastExtended.vue (T-15 → T-7 phase).
 * - 'ec46' — 46-day six-hourly ECMWF IFS04 sub-seasonal, used by
 *   ForecastSubseasonal.vue (T-30 → T-15 phase).
 *
 * The proxy normalises both shapes to a single response with a
 * `totality_slot` (null while the model's horizon doesn't reach Aug 12,
 * which is the case for both today at T-105) and a `latest_slot` (the
 * end of the current forecast horizon, useful for "preview data" demos).
 *
 * Lazy + client-only — same pattern as the other Weather-tab fetches so
 * it doesn't block SSR.
 */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

export interface ForecastSlot {
  valid_time: string
  cloud_cover: number | null
  cloud_cover_low: number | null
  cloud_cover_mid: number | null
  cloud_cover_high: number | null
  wind_speed: number | null
  temperature: number | null
  precipitation_probability: number | null
}

export interface OpenMeteoForecast {
  model: 'ifs_hres' | 'ec46'
  forecast_days: number
  horizon_end: string | null
  totality_slot: ForecastSlot | null
  latest_slot: ForecastSlot | null
  fetched_at: string
  cached: boolean
}

export function useOpenMeteoForecast(
  lat: MaybeRefOrGetter<number | null | undefined>,
  lng: MaybeRefOrGetter<number | null | undefined>,
  model: 'ifs_hres' | 'ec46',
) {
  // useFetch keys default to URL+query, but reactivity on the query object
  // requires explicit refs/computed. Build a query computed so changes to
  // lat/lng (e.g. user navigates between spots) re-fetch automatically.
  const query = computed(() => ({
    lat: toValue(lat),
    lng: toValue(lng),
    model,
  }))

  return useFetch<OpenMeteoForecast>('/api/forecast/openmeteo', {
    query,
    lazy: true,
    server: false,
    key: computed(
      () => `openmeteo-${model}-${toValue(lat)}-${toValue(lng)}`,
    ),
  })
}
