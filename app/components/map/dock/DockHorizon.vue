<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import DockHeader from './DockHeader.vue'
import type { HorizonCheckResponse } from '~/types/horizon'
import { computeSunTrajectory, formatUtcTime } from '~/utils/solar'
import type { SunTrajectoryPoint } from '~/utils/solar'
import type { DockHorizonCtx } from './types'

const props = defineProps<{ ctx: DockHorizonCtx }>()

const { t } = useI18n()
const { authHeaders } = useProStatus()

const loading = ref(true)
const error = ref<'pro_required' | 'outside_coverage' | 'outside_path' | 'failed' | null>(null)
const result = ref<HorizonCheckResponse | null>(null)

// Watch only the coordinates — spotName-only changes (e.g. switching
// between two co-located spots) shouldn't refetch since the API request
// is keyed solely by lat/lng. Each fetch tags itself with `requestId`
// so a slow earlier response can't overwrite a fresher result if the
// user taps a new location while one is still in flight.
let requestId = 0
watch(
  () => [props.ctx.lat, props.ctx.lng] as const,
  async ([lat, lng]) => {
    const id = ++requestId
    loading.value = true
    error.value = null
    result.value = null
    try {
      const data = await $fetch<HorizonCheckResponse>('/api/horizon/check', {
        method: 'POST',
        body: { lat, lng },
        headers: await authHeaders(),
      })
      if (id !== requestId) return
      if (!data.in_totality_path) error.value = 'outside_path'
      else result.value = data
    } catch (e: any) {
      if (id !== requestId) return
      if (e?.statusCode === 401 || e?.statusCode === 403) error.value = 'pro_required'
      else if (e?.statusCode === 422) error.value = 'outside_coverage'
      else error.value = 'failed'
    } finally {
      if (id === requestId) loading.value = false
    }
  },
  { immediate: true },
)

// ─── Chart geometry ───
// Viewport: 320×130 SVG. Y-axis maps elevation degrees to screen y.
// Calibration: 0° → y=114, 30° → y=24 → linear y = 114 - 3·deg.
const Y_DEG_TO_PX = (deg: number) => 114 - 3 * deg
// Reverse-direction grid lines + their labels.
const yGrid = [
  { deg: 30, label: '30°' },
  { deg: 20, label: '20°' },
  { deg: 10, label: '10°' },
  { deg:  0, label: '0°'  },
] as const

// X-axis spans the actual sweep range (the API returns 91 points across
// ±45° around the sun azimuth). Falls back to a synthetic range when no
// data is loaded yet so the axis labels can still render.
const sweepRange = computed(() => {
  const sweep = result.value?.sweep
  if (sweep?.length) {
    let min = sweep[0]!.azimuth
    let max = sweep[0]!.azimuth
    for (const p of sweep) {
      if (p.azimuth < min) min = p.azimuth
      if (p.azimuth > max) max = p.azimuth
    }
    return { min, max }
  }
  const center = result.value?.sun_azimuth ?? 250
  return { min: center - 45, max: center + 45 }
})
function azToX(az: number): number {
  const { min, max } = sweepRange.value
  if (max === min) return 160
  const t = (az - min) / (max - min)
  return Math.max(0, Math.min(1, t)) * 320
}
function altToY(alt: number): number {
  return Y_DEG_TO_PX(Math.max(0, Math.min(38, alt)))
}

// Terrain silhouette — closes back to the chart floor so it can be filled.
const terrainFillPath = computed(() => {
  const sweep = result.value?.sweep
  if (!sweep?.length) return null
  const sorted = sweep.slice().sort((a, b) => a.azimuth - b.azimuth)
  const startX = azToX(sorted[0]!.azimuth).toFixed(1)
  const endX = azToX(sorted[sorted.length - 1]!.azimuth).toFixed(1)
  const inner = sorted.map(p => `${azToX(p.azimuth).toFixed(1)},${altToY(p.horizon_angle).toFixed(1)}`).join(' L ')
  return `M ${startX},114 L ${inner} L ${endX},114 Z`
})

// Sun trajectory across the eclipse afternoon, restricted to the chart's
// azimuth window. Same source of truth as HorizonProfile so the two charts
// agree on where the sun actually goes — instead of a decorative arc.
const sunTrajectory = computed<SunTrajectoryPoint[]>(() => {
  const { min, max } = sweepRange.value
  return computeSunTrajectory(props.ctx.lat, props.ctx.lng, min, max)
})

const trajectoryPath = computed(() => {
  const pts = sunTrajectory.value
  if (pts.length < 2) return null
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${azToX(p.azimuth).toFixed(1)} ${altToY(p.altitude).toFixed(1)}`)
    .join(' ')
})

// Hourly dots + labels along the trajectory. Tight chart width means we
// drop labels too close to the edges; the dot still renders.
const trajectoryHourMarkers = computed(() => {
  const pts = sunTrajectory.value
  const out: { x: number; y: number; label: string; showLabel: boolean }[] = []
  for (const p of pts) {
    if (Math.round(p.utcHours * 60) % 60 !== 0) continue
    const x = azToX(p.azimuth)
    const y = altToY(p.altitude)
    out.push({ x, y, label: formatUtcTime(p.utcHours), showLabel: x > 22 && x < 298 })
  }
  return out
})

// Snap the sun marker onto the trajectory arc so it doesn't drift off it
// when sun_azimuth lands between sample points.
const sunMarker = computed(() => {
  const r = result.value
  if (!r) return null
  const pts = sunTrajectory.value
  if (!pts.length) return { x: azToX(r.sun_azimuth), y: altToY(r.sun_altitude), alt: r.sun_altitude }
  let best = pts[0]!
  let bestDist = Math.abs(best.azimuth - r.sun_azimuth)
  for (const p of pts) {
    const d = Math.abs(p.azimuth - r.sun_azimuth)
    if (d < bestDist) { best = p; bestDist = d }
  }
  return { x: azToX(best.azimuth), y: altToY(best.altitude), alt: r.sun_altitude }
})

// X-axis tick labels at 5 evenly-spaced bearings.
const xLabels = computed(() => {
  const { min, max } = sweepRange.value
  const ticks: { x: number; label: string }[] = []
  for (let i = 0; i < 5; i++) {
    const az = min + (i / 4) * (max - min)
    ticks.push({ x: (i / 4) * 320, label: `${Math.round(((az % 360) + 360) % 360)}°` })
  }
  return ticks
})

// ─── Header / title text ───
const verdictTone = computed<'good' | 'warn' | 'bad'>(() => {
  const v = result.value?.verdict
  if (v === 'clear') return 'good'
  if (v === 'marginal' || v === 'risky') return 'warn'
  return 'bad' // blocked or no data
})
const titleText = computed(() => {
  if (loading.value) return t('dock.horizon_checking')
  if (error.value === 'pro_required') return t('dock.horizon_pro_required')
  if (error.value === 'outside_coverage') return t('dock.horizon_outside_dem')
  if (error.value === 'outside_path') return t('dock.horizon_outside_path')
  if (error.value === 'failed') return t('dock.horizon_failed')
  const r = result.value
  if (!r) return ''
  if (r.verdict === 'clear') return t('dock.horizon_verdict_clear')
  if (r.verdict === 'marginal') return t('dock.horizon_verdict_marginal')
  if (r.verdict === 'risky') return t('dock.horizon_verdict_risky')
  return t('dock.horizon_verdict_blocked')
})
const subtitleText = computed(() => {
  const r = result.value
  if (!r) return null
  const clearance = t('dock.horizon_clearance', { deg: r.clearance_degrees.toFixed(1) })
  return props.ctx.spotName ? `${clearance} · ${props.ctx.spotName}` : clearance
})

const navigateUrl = computed(() =>
  `https://www.google.com/maps/dir/?api=1&destination=${props.ctx.lat},${props.ctx.lng}`)

// Unique id so multiple instances don't share the same gradient def.
const uid = useId()
const gradientId = `dock-horizon-sky-${uid}`
</script>

<template>
  <div>
    <DockHeader :eyebrow="t('dock.horizon_eyebrow')" :dot-var="verdictTone" />

    <div class="title title--small" :data-tone="verdictTone">{{ titleText }}</div>
    <div v-if="subtitleText" class="subtitle">{{ subtitleText }}</div>

    <div class="chart">
      <svg viewBox="0 0 320 130" preserveAspectRatio="none" class="chart-svg">
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" class="sky-top" />
            <stop offset="100%" class="sky-bottom" />
          </linearGradient>
        </defs>

        <!-- Sky background -->
        <rect x="0" y="0" width="320" height="130" :fill="`url(#${gradientId})`" />

        <!-- Y-axis grid + labels -->
        <line
          v-for="row in yGrid"
          :key="`y-${row.deg}`"
          :x1="0" :y1="Y_DEG_TO_PX(row.deg)"
          :x2="320" :y2="Y_DEG_TO_PX(row.deg)"
          class="grid-line"
          stroke-width="0.5"
          stroke-dasharray="2,3"
        />
        <text
          v-for="row in yGrid"
          :key="`yl-${row.deg}`"
          x="6" :y="Y_DEG_TO_PX(row.deg)"
          font-size="8"
          class="axis-label"
          font-family="JetBrains Mono"
        >{{ row.label }}</text>

        <!-- Sun trajectory (real ephemeris) — dashed amber arc -->
        <path
          v-if="trajectoryPath"
          :d="trajectoryPath"
          fill="none"
          stroke="#fbbf24"
          stroke-width="1"
          stroke-dasharray="3,2"
          opacity="0.4"
        />
        <!-- Hourly markers + time labels along the trajectory -->
        <template v-for="(m, i) in trajectoryHourMarkers" :key="`hr-${i}`">
          <circle :cx="m.x" :cy="m.y" r="1.8" fill="#fbbf24" opacity="0.6" />
          <text
            v-if="m.showLabel"
            :x="m.x"
            :y="m.y - 5"
            font-size="7"
            class="trajectory-label"
            font-family="JetBrains Mono"
            text-anchor="middle"
            opacity="0.85"
          >{{ m.label }}</text>
        </template>

        <!-- Terrain silhouette (real DEM) — theme-aware fill + stroke -->
        <path
          v-if="terrainFillPath"
          :d="terrainFillPath"
          class="terrain"
          stroke-width="1"
        />

        <!-- Sun marker — halo + core, snapped to the trajectory arc -->
        <template v-if="sunMarker">
          <circle :cx="sunMarker.x" :cy="sunMarker.y" r="9"   fill="#f59e0b" opacity="0.18" />
          <circle :cx="sunMarker.x" :cy="sunMarker.y" r="5.5" fill="#f59e0b" opacity="0.32" />
          <circle :cx="sunMarker.x" :cy="sunMarker.y" r="3.5" fill="#f59e0b" />
          <text
            :x="sunMarker.x"
            :y="Math.max(10, sunMarker.y - 10)"
            font-size="9"
            font-weight="600"
            fill="#f59e0b"
            font-family="JetBrains Mono"
            text-anchor="middle"
          >{{ t('dock.horizon_sun_label', { deg: sunMarker.alt.toFixed(0) }) }}</text>
        </template>

        <!-- X-axis labels -->
        <text
          v-for="(t, i) in xLabels"
          :key="`xl-${i}`"
          :x="Math.max(8, Math.min(312, t.x))"
          y="124"
          font-size="8"
          class="axis-label"
          font-family="JetBrains Mono"
          :text-anchor="i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'"
        >{{ t.label }}</text>

        <!-- Loading shimmer -->
        <text
          v-if="loading"
          x="160" y="68"
          font-size="11"
          class="loading-label"
          font-family="JetBrains Mono"
          text-anchor="middle"
        >{{ t('dock.horizon_loading') }}</text>
      </svg>
    </div>

    <div class="caption">{{ t('dock.horizon_attribution') }}</div>

    <div class="actions">
      <a
        class="btn-ghost btn-ghost--full"
        :href="navigateUrl"
        target="_blank"
        rel="noopener"
      >{{ t('dock.horizon_btn_navigate') }}</a>
    </div>
  </div>
</template>

<style scoped>
/* `.title`, `.btn-ghost` come from MapDock's shared style. */
.subtitle {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  margin-bottom: 10px;
}
.chart {
  position: relative;
  height: 130px;
  margin-bottom: 10px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgb(var(--border-subtle) / 0.16);
}
.chart-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.caption {
  margin-bottom: 10px;
  text-align: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgb(var(--ink-1) / 0.42);
  text-transform: uppercase;
}
.actions { display: flex; gap: 8px; }

/* Theme-aware horizon chart colours via shared tokens (main.css). */
.sky-top    { stop-color: rgb(var(--horizon-sky-top)); }
.sky-bottom { stop-color: rgb(var(--horizon-sky-bottom)); }
.terrain    {
  fill:   rgb(var(--horizon-terrain-fill));
  stroke: rgb(var(--horizon-terrain-stroke));
}
.trajectory-label { fill: rgb(var(--horizon-accent)); }

/* DockHorizon-specific: the chart is small (320×130) so the labels and
   grid get slightly brighter slate values than HorizonProfile uses to
   stay legible at this size. */
.grid-line       { stroke: #2a3548; }
.axis-label,
.loading-label   { fill: #94a3b8; }
html.light .grid-line     { stroke: rgba(42, 31, 20, 0.12); }
html.light .axis-label,
html.light .loading-label { fill: #6b5d5d; }
</style>
