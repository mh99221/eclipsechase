/**
 * Phase detection for weather forecast availability.
 *
 * The app shows different forecast products as we approach the eclipse:
 * climatology only when we're far out (>30 d), then progressively narrower
 * forecast windows as the data gets reliable. Source-of-truth thresholds
 * mirror eclipsechase-weather-forecast-spec.md §5; tweaking a phase boundary
 * is a one-line change here that the entire Weather tab picks up.
 *
 * Eclipse instant chosen as 17:43 UTC — earliest C2 across the Iceland path.
 * The exact second varies a few seconds per spot (longitude); the per-spot
 * value is enriched on the spot API response from grid.json. For phase
 * thresholds, the path's earliest C2 is the right anchor.
 */
import { computed, ref, type Ref } from 'vue'

export const ECLIPSE_DATE = new Date('2026-08-12T17:43:00Z')

export type ForecastPhase =
  | 'climatology'   // > 30 days — only historical means are meaningful
  | 'subseasonal'   // 15–30 days — EC46 weekly probability bands light up
  | 'extended'      // 7–15 days — IFS HRES daily forecast available with low confidence
  | 'reliable'      // 1–7 days — HARMONIE-AROME hourly + ensemble narrowing
  | 'nowcast'       // < 1 day  — live obs + satellite imagery

export function useForecastPhase(now: Ref<Date> = ref(new Date())) {
  const daysUntil = computed(() =>
    (ECLIPSE_DATE.getTime() - now.value.getTime()) / 86_400_000,
  )

  const phase = computed<ForecastPhase>(() => {
    const d = daysUntil.value
    if (d > 30) return 'climatology'
    if (d > 15) return 'subseasonal'
    if (d > 7) return 'extended'
    if (d > 1) return 'reliable'
    return 'nowcast'
  })

  return { phase, daysUntil }
}
