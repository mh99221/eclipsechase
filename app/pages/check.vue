<script setup lang="ts">
/**
 * /check — free, public coordinate check.
 *
 * Two states on one route:
 *   - no lat/lng query: empty form for paste-and-go
 *   - lat/lng present : result page (shareable URL)
 *
 * The form submit redirects to the canonical `?lat=…&lng=…` URL so the
 * result is shareable. URL coords are rounded to 5 decimals (~1 m).
 */
import type { CheckResult } from '~/types/check'
import type { HorizonProfileData } from '~/types/horizon'
import { parseCoordinates } from '~/utils/parseCoordinates'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const siteUrl = (config.public.siteUrl as string) || 'https://eclipsechase.is'

const input = ref('')
const error = ref('')

// Parse query into reactive lat/lng. When either is missing the API
// call is skipped (immediate: !!latParam) and `data` stays null.
const latParam = computed(() => {
  const v = route.query.lat
  return typeof v === 'string' ? v : ''
})
const lngParam = computed(() => {
  const v = route.query.lng
  return typeof v === 'string' ? v : ''
})
const hasQueryCoords = computed(() => latParam.value !== '' && lngParam.value !== '')

// useFetch handles SSR + client hydration + reactivity to query changes.
// We disable when no lat/lng so the empty form doesn't trigger a request.
const { data: result, pending, error: fetchError, refresh } = await useFetch<CheckResult>(
  '/api/check',
  {
    query: { lat: latParam, lng: lngParam },
    key: 'check-result',
    immediate: hasQueryCoords.value,
    server: hasQueryCoords.value,
    watch: [latParam, lngParam],
  },
)

// Surface API errors to the user as the friendly banner.
watchEffect(() => {
  if (fetchError.value) {
    const e = fetchError.value as any
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message
      || 'Something went wrong. Please try again.'
  }
})

// Pre-fill the input box from the URL so the user can edit and re-check.
watchEffect(() => {
  if (!input.value && hasQueryCoords.value) {
    const lat = parseFloat(latParam.value)
    const lng = parseFloat(lngParam.value)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      input.value = `${lat}, ${lng}`
    }
  }
})

const canonicalUrl = computed(() => {
  if (!result.value) return `${siteUrl}/check`
  const lat = result.value.input.lat.toFixed(5)
  const lng = result.value.input.lng.toFixed(5)
  return `${siteUrl}/check?lat=${lat}&lng=${lng}`
})

async function handleSubmit() {
  error.value = ''
  const parsed = parseCoordinates(input.value)
  if ('error' in parsed) {
    error.value = parsed.error === 'outside_iceland'
      ? 'These coordinates are outside Iceland. Iceland is roughly 63°N–67°N and 13°W–25°W. Did you mix up lat and lng?'
      : 'Could not parse coordinates. Try a Google Maps link, or a decimal pair like 65.86182, -23.48019.'
    return
  }
  await router.push({
    path: '/check',
    query: { lat: parsed.lat.toFixed(5), lng: parsed.lng.toFixed(5) },
  })
}

// Build HorizonProfile view-model — only render when we have a real
// in-grid horizon match.
const horizonProfileData = computed<HorizonProfileData | null>(() => {
  if (!result.value) return null
  const h = result.value.horizon
  if (h.coverage !== 'in-grid' || h.verdict === 'unknown' || h.clearanceDegrees == null) {
    return null
  }
  return {
    sun_azimuth: h.sunAzimuth,
    sun_altitude: h.sunAltitude,
    sweep: h.sweep,
    verdict: h.verdict as Exclude<typeof h.verdict, 'unknown'>,
    clearance_degrees: h.clearanceDegrees,
  }
})

useHead({
  title: () => result.value
    ? `Eclipse check — ${result.value.input.lat.toFixed(4)}°N, ${Math.abs(result.value.input.lng).toFixed(4)}°W`
    : 'Check any spot for the August 12, 2026 Iceland eclipse',
  meta: [
    {
      name: 'description',
      content: () => result.value
        ? (result.value.totality.insidePath
          ? `Inside the path of totality. ${
            result.value.cloudHistory?.cell.avg_cloud_cover != null
              ? `${result.value.cloudHistory.cell.avg_cloud_cover}% historical cloud cover.`
              : ''
          }`.trim()
          : 'Outside the path of totality at this location.')
        : 'Paste GPS coordinates or a Google Maps link and get a horizon verdict, 10-year cloud history, and totality info for any point in Iceland. Free, no signup.',
    },
    { property: 'og:title', content: 'Eclipse coordinate check — EclipseChase.is' },
    { property: 'og:url', content: () => canonicalUrl.value },
    { property: 'og:type', content: 'website' },
  ],
  link: [
    // Strip query params from canonical so search doesn't index every
    // unique lat/lng URL as a separate page.
    { rel: 'canonical', href: `${siteUrl}/check` },
  ],
})
</script>

<template>
  <PageShell screen="check" width="reading">
    <header class="mb-8">
      <p class="font-mono text-xs tracking-[0.3em] text-accent/80 uppercase mb-3">
        The check
      </p>
      <h1 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink-1 mb-3">
        Check any spot for the August 12 eclipse.
      </h1>
      <p v-if="!result" class="text-base text-ink-2 leading-relaxed max-w-2xl">
        Paste coordinates or a Google Maps link. We'll check terrain
        horizon, 10-year cloud history, and your position in the path of
        totality — all from the same data we use for our curated spots.
      </p>
    </header>

    <!-- Input form: always visible so user can re-check from result page -->
    <form
      class="mb-6"
      @submit.prevent="handleSubmit"
    >
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="65.86182, -23.48019"
          class="flex-1 px-4 py-3 bg-surface border border-border-subtle/60 rounded text-ink-1 placeholder:text-ink-3 font-mono text-sm focus:outline-none focus:border-accent/60 transition-colors"
          aria-label="Paste coordinates or a Google Maps link"
        >
        <button
          type="submit"
          :disabled="pending"
          class="px-5 py-3 bg-accent text-accent-ink font-mono text-xs tracking-wider uppercase rounded hover:bg-accent-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ pending ? 'Checking…' : 'Check spot →' }}
        </button>
      </div>
      <p v-if="error" class="mt-3 px-3 py-2.5 ec-banner-warn text-xs font-mono">
        {{ error }}
      </p>
    </form>

    <!-- Hints (only when no result yet) -->
    <div v-if="!result && !hasQueryCoords" class="mb-12 text-sm text-ink-3">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] mb-2">
        Accepted formats
      </p>
      <ul class="space-y-1.5 list-none pl-0">
        <li>Decimal pair: <code class="text-ink-2">65.86182, -23.48019</code></li>
        <li>With hemisphere: <code class="text-ink-2">65.86°N, 23.48°W</code></li>
        <li>Google Maps link</li>
        <li>Apple Maps link</li>
      </ul>
    </div>

    <!-- Loading -->
    <div
      v-if="pending && !result"
      class="py-12 text-center font-mono text-xs text-ink-3 tracking-wider"
    >
      Computing…
    </div>

    <!-- Result -->
    <div v-if="result && !pending" class="space-y-10">
      <CheckResultCard :result="result" />

      <!-- Horizon profile — only if we actually have grid coverage -->
      <section v-if="horizonProfileData">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-3">
          Horizon profile
        </p>
        <HorizonProfile
          :data="horizonProfileData"
          :lat="result.input.lat"
          :lng="result.input.lng"
        />
        <p
          v-if="result.horizon.nearestGridPoint && result.horizon.nearestGridPoint.distanceMeters > 50"
          class="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3"
        >
          Sampled {{ Math.round(result.horizon.nearestGridPoint.distanceMeters) }} m
          from your input point
        </p>
      </section>

      <CheckContactTimes :result="result" />

      <CheckCloudHistory :result="result" />

      <CheckSoftCTA :inside-path="result.totality.insidePath" />

      <CheckShareButtons :result="result" />
    </div>
  </PageShell>
</template>

<style scoped>
code {
  font-family: var(--font-mono, monospace);
  font-size: 0.85em;
}
</style>
