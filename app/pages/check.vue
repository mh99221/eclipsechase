<script setup lang="ts">
/**
 * /check — free, public coordinate check.
 *
 * Two states on one route:
 *   - no lat/lng query: empty form for paste-and-go
 *   - lat/lng present : result page (shareable URL)
 *
 * Form is intentionally a bare <div> (not <form>) so the browser
 * never falls back to a native GET submit that would strip the
 * canonical ?lat=&lng= query — submission goes via @click on the
 * button and @keyup.enter on the input.
 */
import type { CheckResult } from '~/types/check'
import type { HorizonProfileData } from '~/types/horizon'
import { formatLatLng } from '~/utils/eclipse'
import { parseCoordinates } from '~/utils/parseCoordinates'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const siteUrl = (config.public.siteUrl as string) || 'https://eclipsechase.is'

const input = ref('')
const error = ref('')

const latParam = computed(() => {
  const v = route.query.lat
  return typeof v === 'string' ? v : ''
})
const lngParam = computed(() => {
  const v = route.query.lng
  return typeof v === 'string' ? v : ''
})
const hasQueryCoords = computed(() => latParam.value !== '' && lngParam.value !== '')

const { data: result, pending, error: fetchError } = await useFetch<CheckResult>(
  '/api/check',
  {
    query: { lat: latParam, lng: lngParam },
    key: 'check-result',
    immediate: hasQueryCoords.value,
    server: hasQueryCoords.value,
    watch: [latParam, lngParam],
  },
)

watchEffect(() => {
  if (fetchError.value) {
    const e = fetchError.value as any
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message
      || 'Something went wrong. Please try again.'
  }
})

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
    { rel: 'canonical', href: `${siteUrl}/check` },
  ],
})
</script>

<template>
  <PageShell screen="check">
    <div class="check-content">
    <!-- Page header is always visible. The result hero below takes
         a different visual register (coords as h1, no eyebrow), so
         showing both side-by-side stays uncluttered while keeping
         the page's purpose clear for shared-link visitors who land
         straight on a result. -->
    <header class="page-header">
      <Eyebrow tone="accent" class="page-eyebrow">The check</Eyebrow>
      <h1 class="page-h1">
        Check any spot for the August 12 eclipse.
      </h1>
      <p class="page-subhead">
        Paste coordinates or a Google Maps link and we'll check the
        terrain horizon at sunset, ten years of historical cloud cover,
        and whether the point sits inside the path of totality — using
        the same ÍslandsDEM + ERA5 data we use for our curated spots.
        Free, no signup. Share the result URL.
      </p>
    </header>

    <!-- Input row: bare <div>, not <form>, so the browser cannot
         fall back to a native GET submit on hydration glitches. -->
    <div class="input-row">
      <div class="input-row-inner">
        <input
          v-model="input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="65.86182, -23.48019"
          class="coord-input"
          aria-label="Paste coordinates or a Google Maps link"
          @keyup.enter="handleSubmit"
        >
        <button
          type="button"
          class="btn-corona coord-submit"
          :disabled="pending"
          @click="handleSubmit"
        >
          {{ pending ? 'Checking…' : 'Check spot →' }}
        </button>
      </div>
      <p v-if="error" class="input-error ec-banner-warn">{{ error }}</p>
    </div>

    <!-- Format hints — only on empty state. -->
    <section v-if="!result && !hasQueryCoords" class="hints">
      <Eyebrow tone="dim" class="hints-eyebrow">Accepted formats</Eyebrow>
      <ul class="hints-list">
        <li>Decimal pair <code>65.86182, -23.48019</code></li>
        <li>With hemisphere <code>65.86°N, 23.48°W</code></li>
        <li>Google Maps link</li>
        <li>Apple Maps link</li>
      </ul>
    </section>

    <!-- Loading -->
    <div v-if="pending && !result" class="loading-row">Computing…</div>

    <!-- Result -->
    <div v-if="result && !pending" class="result-stack">
      <CheckResultCard :result="result" />
      <CheckStatStrip :result="result" />

      <!-- Mini map — totality path band + user pin. Client-only because
           Mapbox doesn't SSR. Imported lazily so the JS only ships when
           a result is shown, not on the empty form. The placeholder
           keeps the page from reflowing once Mapbox lands. -->
      <section class="result-section">
        <Eyebrow tone="dim">Location</Eyebrow>
        <ClientOnly>
          <LazyCheckMiniMap :result="result" />
          <template #fallback>
            <div class="map-skeleton" aria-hidden="true" />
          </template>
        </ClientOnly>
      </section>

      <!-- Horizon profile — only when we have grid coverage. -->
      <section v-if="horizonProfileData" class="result-section">
        <Eyebrow tone="dim">Horizon profile</Eyebrow>
        <HorizonProfile
          :data="horizonProfileData"
          :lat="result.input.lat"
          :lng="result.input.lng"
        />
        <p
          v-if="result.horizon.nearestGridPoint && result.horizon.nearestGridPoint.distanceMeters > 50"
          class="snap-note"
        >
          Sampled {{ Math.round(result.horizon.nearestGridPoint.distanceMeters) }} m
          from your input point
          ({{ formatLatLng(result.horizon.nearestGridPoint.lat, result.horizon.nearestGridPoint.lng) }})
        </p>
      </section>

      <section class="result-section">
        <Eyebrow tone="dim">Contact times (UTC)</Eyebrow>
        <Card>
          <CheckContactTimes :result="result" />
        </Card>
      </section>

      <section v-if="result.cloudHistory" class="result-section">
        <CheckCloudHistory :result="result" />
      </section>

      <section class="result-section">
        <Eyebrow tone="dim">What next</Eyebrow>
        <CheckSoftCTA :inside-path="result.totality.insidePath" />
      </section>

      <section class="result-section">
        <Eyebrow tone="dim">Share this check</Eyebrow>
        <CheckShareButtons :result="result" />
      </section>
    </div>
    </div>
  </PageShell>
</template>

<style scoped>
/* Match the spots-list gutter pattern: PageShell already caps content
   at the default 768 px reading width; we just add 16 px horizontal
   padding on mobile and 24 px on tablet+. */
.check-content {
  width: 100%;
  padding-left: 16px;
  padding-right: 16px;
}
@media (min-width: 640px) {
  .check-content {
    padding-left: 24px;
    padding-right: 24px;
  }
}

.page-header {
  margin-bottom: 24px;
}
.page-eyebrow {
  margin-bottom: 12px;
}
.page-h1 {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: rgb(var(--ink-1));
  line-height: 1.1;
  margin: 0 0 12px;
}
@media (min-width: 640px) {
  .page-h1 { font-size: 40px; }
}
@media (min-width: 1024px) {
  .page-h1 { font-size: 48px; }
}
.page-subhead {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.55;
  color: rgb(var(--ink-1) / 0.78);
  max-width: 38rem;
}

.input-row {
  margin-bottom: 20px;
}
.input-row-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
@media (min-width: 640px) {
  .input-row-inner { flex-direction: row; }
}
.coord-input {
  flex: 1;
  min-width: 0;
  padding: 13px 16px;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.18);
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  color: rgb(var(--ink-1));
  transition: border-color 0.15s, background 0.15s;
}
.coord-input::placeholder {
  color: rgb(var(--ink-1) / 0.32);
}
.coord-input:focus {
  outline: none;
  border-color: rgb(var(--accent) / 0.62);
  background: rgb(var(--surface) / 0.06);
}
.coord-submit {
  white-space: nowrap;
}
.coord-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.input-error {
  margin-top: 10px;
  padding: 10px 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11.5px;
  line-height: 1.5;
  letter-spacing: 0.02em;
  border-radius: 8px;
}

.hints {
  margin-top: 8px;
  margin-bottom: 28px;
}
.hints-eyebrow {
  margin-bottom: 10px;
}
.hints-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13.5px;
  color: rgb(var(--ink-1) / 0.78);
}
.hints-list code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 4px;
  padding: 1px 6px;
  margin-left: 6px;
  color: rgb(var(--ink-1));
}

.loading-row {
  padding: 48px 0;
  text-align: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
}

.result-stack {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.result-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.snap-note {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
}
.map-skeleton {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  background:
    linear-gradient(180deg,
      rgb(var(--surface) / 0.06) 0%,
      rgb(var(--surface) / 0.02) 100%);
}
</style>
