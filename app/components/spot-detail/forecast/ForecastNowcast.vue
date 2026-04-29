<script setup lang="ts">
/**
 * Day-of nowcast (T-1 → T-0 in real life). Three deliverables per spec
 * §3.4 + §11 step 7:
 *
 * 1. Eclipse countdown — ticks every 30 s, switches between "TOTALITY IN
 *    Xm Ys", "TOTALITY ACTIVE Xs", and "TOTALITY ENDED Xm ago" based on
 *    the spot's per-longitude totality_start (enriched from grid.json) or
 *    the path's earliest C2 fallback.
 *
 * 2. Current cloud cover — pulls /api/weather/forecast-timeline at the
 *    nearest station, refreshing every 5 min per spec §6 cadence. Same
 *    "now strip" treatment as ForecastReliable so the cards rhyme.
 *
 * 3. EUMETSAT live imagery CTA — link out to view.eumetsat.int. Spec
 *    explicitly recommends the link-out path over embedding (commercial
 *    embed terms are unclear; the public viewer is free for visualisation).
 *
 * Preview-mode behaviour: when `?asOf=` is set, we lock a baseline of
 * (simulated time, real time) at mount and advance the simulated time at
 * 1× the real wall-clock rate. So `?asOf=2026-08-12T17:42` sets the timer
 * to "Totality in 1 min" and the user actually sees it count down through
 * totality and out the other side over the next ~3 minutes — useful for
 * QA-ing all three timer states without waiting until August.
 */
import { useNearestStation } from '~/composables/useNearestStation'
import { ECLIPSE_DATE } from '~/composables/useForecastPhase'
import { cloudColor, cloudLevel } from '~/utils/eclipse'

interface ForecastSlot {
  valid_time: string
  cloud_cover: number | null
  precip_prob?: number | null
}
interface ForecastStation {
  id: string
  name: string
  forecasts: ForecastSlot[]
}
interface ForecastResponse {
  stations: ForecastStation[]
  hours: number
  stale: boolean
  fetched_at: string
}

const props = defineProps<{
  spot: {
    lat: number
    lng: number
    slug: string
    totality_start?: string | null
    totality_duration_seconds?: number | null
  }
}>()

const { t } = useI18n()
const route = useRoute()

// ─── Simulated-now baseline ────────────────────────────────────────────
// In preview mode, freeze the offset between simulated-now and real-now
// at mount and let it advance at 1× wall-clock rate. Outside preview mode,
// always return real Date. Computed at setup so SSR returns a sensible
// fixed value too.
const previewBaseline = (() => {
  const asOf = route.query.asOf
  if (typeof asOf !== 'string') return null
  const simulated = new Date(asOf)
  if (Number.isNaN(simulated.getTime())) return null
  return { simulated, realStart: Date.now() }
})()

function getSimulatedNow(): Date {
  if (!previewBaseline) return new Date()
  const elapsed = Date.now() - previewBaseline.realStart
  return new Date(previewBaseline.simulated.getTime() + elapsed)
}

const nowTime = ref(getSimulatedNow())

// ─── Forecast data ─────────────────────────────────────────────────────
const { nearest } = useNearestStation(
  () => props.spot.lat,
  () => props.spot.lng,
)

const { data: forecastData, refresh } = useFetch<ForecastResponse>(
  '/api/weather/forecast-timeline?hours=12',
  { lazy: true, server: false, key: 'forecast-nowcast' },
)

// ─── Tickers ───────────────────────────────────────────────────────────
// 30 s for the countdown (sub-minute precision matters as we approach C2).
// 5 min for forecast refresh — matches spec §6 nowcast cadence and respects
// the cron's 15-min ingest cadence (no point hammering Supabase faster).
let timeTimer: ReturnType<typeof setInterval> | null = null
let dataTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timeTimer = setInterval(() => { nowTime.value = getSimulatedNow() }, 30_000)
  dataTimer = setInterval(() => { refresh() }, 5 * 60 * 1000)
})
onBeforeUnmount(() => {
  if (timeTimer) clearInterval(timeTimer)
  if (dataTimer) clearInterval(dataTimer)
})

// ─── Eclipse instants ──────────────────────────────────────────────────
const eclipseInstant = computed(() => {
  if (props.spot.totality_start) {
    const d = new Date(props.spot.totality_start)
    if (!Number.isNaN(d.getTime())) return d
  }
  return ECLIPSE_DATE
})
const eclipseEnd = computed(() => {
  const dur = props.spot.totality_duration_seconds ?? 130
  return new Date(eclipseInstant.value.getTime() + dur * 1000)
})

const timer = computed(() => {
  const now = nowTime.value.getTime()
  const start = eclipseInstant.value.getTime()
  const end = eclipseEnd.value.getTime()
  if (now < start) return { state: 'before' as const, ms: start - now }
  if (now < end) return { state: 'during' as const, ms: end - now }
  return { state: 'after' as const, ms: now - end }
})

// h XXm XXs / m XXs / s
function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

// ─── Current conditions ────────────────────────────────────────────────
const stationForecasts = computed(() => {
  if (!forecastData.value || !nearest.value) return null
  return (
    forecastData.value.stations.find(s => s.id === nearest.value!.id) ?? null
  )
})
const nowSlot = computed<ForecastSlot | null>(
  () => stationForecasts.value?.forecasts[0] ?? null,
)
const nowCloud = computed(() => nowSlot.value?.cloud_cover ?? null)
const nowLabel = computed(() => cloudLevel(nowCloud.value).label)
const nowDotColor = computed(() => cloudColor(nowCloud.value))
const stale = computed(() => forecastData.value?.stale ?? false)

// ─── External link ─────────────────────────────────────────────────────
// EUMETView root opens the public Meteosat viewer. Coordinate params
// vary by product and aren't reliably documented — linking to root means
// the page always loads; users navigate to Iceland from the global view
// in one or two pans/zooms. Per spec §3.4 this is the recommended path.
const eumetsatUrl = 'https://view.eumetsat.int/'
</script>

<template>
  <Card>
    <CardTitle>{{ t('v0.forecast.nowcast_title') }}</CardTitle>

    <!-- Eclipse countdown. State drives the eyebrow copy + timer colour. -->
    <div class="now-timer" :data-state="timer.state">
      <div class="now-timer-eyebrow">
        <template v-if="timer.state === 'before'">{{ t('v0.forecast.nowcast_timer_before') }}</template>
        <template v-else-if="timer.state === 'during'">{{ t('v0.forecast.nowcast_timer_during') }}</template>
        <template v-else>{{ t('v0.forecast.nowcast_timer_after') }}</template>
      </div>
      <div class="now-timer-value">{{ formatDuration(timer.ms) }}</div>
    </div>

    <!-- Current cloud cover at nearest station. -->
    <div v-if="nowSlot" class="now-cloud">
      <span class="now-dot" :style="{ background: nowDotColor }" />
      <div class="now-cloud-stack">
        <div class="now-cloud-value">
          <template v-if="nowCloud != null">
            {{ nowCloud }}<span class="now-unit">%</span>
          </template>
          <template v-else>—</template>
        </div>
        <div class="now-cloud-label">{{ nowLabel }}</div>
      </div>
      <div class="now-cloud-meta">
        <div class="now-cloud-eyebrow">{{ t('v0.forecast.nowcast_cloud_eyebrow') }}</div>
        <div v-if="stale" class="now-stale">{{ t('v0.forecast.reliable_stale') }}</div>
      </div>
    </div>
    <div v-else class="now-cloud-missing">
      {{ t('v0.forecast.nowcast_no_station') }}
    </div>

    <!-- EUMETSAT CTA. Big tappable surface with arrow affordance — this is
         the headline action on eclipse morning so it warrants visual weight. -->
    <a
      :href="eumetsatUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="now-eumetsat"
    >
      <span class="now-eumetsat-icon" aria-hidden="true">
        <!-- Crosshair-on-globe glyph; reads as "live satellite view" without copy. -->
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3v18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" stroke-width="0.8" opacity="0.5" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </span>
      <span class="now-eumetsat-label">
        <span class="now-eumetsat-title">{{ t('v0.forecast.nowcast_eumetsat_title') }}</span>
        <span class="now-eumetsat-sub">{{ t('v0.forecast.nowcast_eumetsat_sub') }}</span>
      </span>
      <span class="now-eumetsat-arrow" aria-hidden="true">→</span>
    </a>

    <p class="now-attribution">
      {{ t('v0.forecast.nowcast_attribution', {
        station: stationForecasts?.name ?? '—',
      }) }}
    </p>
  </Card>
</template>

<style scoped>
/* ── Eclipse timer ───────────────────────────────────────────────────
   Three states: before (default ink), during (accent — eclipse in
   progress, draw the eye), after (dim — historical). The big-number
   value uses tabular-nums so the seconds tick without horizontal jitter. */
.now-timer {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 14px;
}
.now-timer-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  flex-shrink: 0;
}
.now-timer-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.now-timer[data-state='during'] .now-timer-eyebrow,
.now-timer[data-state='during'] .now-timer-value {
  color: rgb(var(--accent));
}
.now-timer[data-state='during'] .now-timer-value {
  /* Pulse so "TOTALITY ACTIVE" reads as live state. */
  animation: timer-pulse 1.6s ease-in-out infinite;
}
.now-timer[data-state='after'] .now-timer-value {
  color: rgb(var(--ink-1) / 0.62);
}
@keyframes timer-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .now-timer[data-state='during'] .now-timer-value { animation: none; }
}

/* ── Current cloud strip — same shape as ForecastReliable.now-strip ── */
.now-cloud {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 14px;
}
.now-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgb(var(--surface) / 0.04);
}
.now-cloud-stack { line-height: 1; }
.now-cloud-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
}
.now-unit {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--ink-1) / 0.42);
  margin-left: 1px;
}
.now-cloud-label {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 4px;
}
.now-cloud-meta { text-align: right; }
.now-cloud-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
}
.now-stale {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--warn));
  margin-top: 4px;
}
.now-cloud-missing {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-1) / 0.42);
  padding-bottom: 14px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 14px;
}

/* ── EUMETSAT CTA tile ───────────────────────────────────────────────
   Big tappable card. Accent tint on hover so it feels like the primary
   day-of action without competing with the Pro CTA elsewhere on the
   page. */
.now-eumetsat {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
  border: 1px solid rgb(var(--accent) / 0.22);
  border-radius: 8px;
  background: rgb(var(--accent) / 0.04);
  color: rgb(var(--ink-1));
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}
.now-eumetsat:hover {
  background: rgb(var(--accent) / 0.08);
  border-color: rgb(var(--accent) / 0.4);
  transform: translateY(-1px);
}
.now-eumetsat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--accent));
  flex-shrink: 0;
}
.now-eumetsat-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.now-eumetsat-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  letter-spacing: -0.005em;
}
.now-eumetsat-sub {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
}
.now-eumetsat-arrow {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 18px;
  color: rgb(var(--accent));
  flex-shrink: 0;
  transition: transform 0.15s;
}
.now-eumetsat:hover .now-eumetsat-arrow {
  transform: translateX(2px);
}

.now-attribution {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: rgb(var(--ink-1) / 0.42);
  margin: 0;
  line-height: 1.5;
}
</style>
