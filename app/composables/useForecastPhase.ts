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
 *
 * Preview override: pass `?asOf=YYYY-MM-DD` (or any Date-parseable string)
 * to simulate being at that calendar instant. Always-on — the PreviewBadge
 * banner makes the override state highly visible, the canonical URL on
 * each spot detail page strips query params so SEO can't pick up
 * simulated phases as duplicate content, and the URL-param shape makes
 * sharing demo links across all environments (local dev, Vercel preview,
 * production) trivial. Tests bypass the runtime path by passing an
 * explicit `now` ref.
 */
import { computed, ref, type Ref } from 'vue'

export const ECLIPSE_DATE = new Date('2026-08-12T17:43:00Z')

export type ForecastPhase =
  | 'climatology'   // > 30 days — only historical means are meaningful
  | 'subseasonal'   // 15–30 days — EC46 weekly probability bands light up
  | 'extended'      // 7–15 days — IFS HRES daily forecast available with low confidence
  | 'reliable'      // 1–7 days — HARMONIE-AROME hourly + ensemble narrowing
  | 'nowcast'       // < 1 day  — live obs + satellite imagery

interface UseForecastPhaseReturn {
  phase: Readonly<Ref<ForecastPhase>>
  daysUntil: Readonly<Ref<number>>
  isPreview: Readonly<Ref<boolean>>
}

export function useForecastPhase(now?: Ref<Date>): UseForecastPhaseReturn {
  // Test-mode short-circuit: when caller passes an explicit `now`, skip the
  // Nuxt-context hooks (useRoute / useRuntimeConfig) entirely. Lets vitest
  // exercise the threshold logic without mocking the runtime.
  if (now) {
    const daysUntil = computed(
      () => (ECLIPSE_DATE.getTime() - now.value.getTime()) / 86_400_000,
    )
    const phase = computed<ForecastPhase>(() => phaseFromDays(daysUntil.value))
    return { phase, daysUntil, isPreview: ref(false) }
  }

  // Runtime mode: read the URL once and let Vue's reactivity pick up the
  // route-query updates that the router pushes on navigation.
  const route = import.meta.client ? useRoute() : null

  const previewDate = computed<Date | null>(() => {
    if (!route) return null
    const asOf = route.query.asOf
    if (typeof asOf !== 'string') return null
    const parsed = new Date(asOf)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  })

  const effectiveNow = computed<Date>(() => previewDate.value ?? new Date())

  const daysUntil = computed(
    () => (ECLIPSE_DATE.getTime() - effectiveNow.value.getTime()) / 86_400_000,
  )
  const phase = computed<ForecastPhase>(() => phaseFromDays(daysUntil.value))
  const isPreview = computed(() => previewDate.value !== null)

  return { phase, daysUntil, isPreview }
}

function phaseFromDays(d: number): ForecastPhase {
  if (d > 30) return 'climatology'
  if (d > 15) return 'subseasonal'
  if (d > 7) return 'extended'
  if (d > 1) return 'reliable'
  return 'nowcast'
}
