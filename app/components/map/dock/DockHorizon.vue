<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DockHeader from './DockHeader.vue'
import type { HorizonCheckResponse } from '~/types/horizon'
import type { DockHorizonCtx } from './types'

const props = defineProps<{ ctx: DockHorizonCtx }>()

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

// X-axis: spans 90° centred on the sun azimuth (matches sweep ±45°).
const xRange = computed(() => {
  const r = result.value
  // Default to ~250° (the WSW totality azimuth in Iceland) when no data.
  const center = r?.sun_azimuth ?? 250
  return { min: center - 45, max: center + 45 }
})
const azToX = (az: number) => {
  const { min, max } = xRange.value
  const t = (az - min) / (max - min)
  return Math.max(0, Math.min(1, t)) * 320
}

// Build the terrain polyline d="M …" from real sweep points.
const terrainPath = computed(() => {
  const sweep = result.value?.sweep
  if (!sweep?.length) return null
  const pts = sweep
    .slice()
    .sort((a, b) => a.azimuth - b.azimuth)
    .map(p => `${azToX(p.azimuth).toFixed(1)} ${Y_DEG_TO_PX(p.horizon_angle).toFixed(1)}`)
  return 'M ' + pts.join(' L ')
})
const terrainFillPath = computed(() => {
  const tp = terrainPath.value
  if (!tp) return null
  return `${tp} L 320 130 L 0 130 Z`
})

// Sun position dot.
const sunPos = computed(() => {
  const r = result.value
  if (!r) return null
  return { x: azToX(r.sun_azimuth), y: Y_DEG_TO_PX(r.sun_altitude), alt: r.sun_altitude }
})

// X-axis tick labels at 5 evenly-spaced bearings.
const xLabels = computed(() => {
  const { min, max } = xRange.value
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
  if (loading.value) return 'Checking horizon…'
  if (error.value === 'pro_required') return 'Pro required'
  if (error.value === 'outside_coverage') return 'Outside DEM coverage'
  if (error.value === 'outside_path') return 'Outside path of totality'
  if (error.value === 'failed') return 'Could not check horizon'
  const r = result.value
  if (!r) return ''
  if (r.verdict === 'clear') return 'Sun well above terrain'
  if (r.verdict === 'marginal') return 'Marginal clearance'
  if (r.verdict === 'risky') return 'Risky horizon'
  return 'Sun blocked at totality'
})
const subtitleText = computed(() => {
  const r = result.value
  if (!r) return null
  const clearance = `${r.clearance_degrees.toFixed(1)}° clearance`
  return props.ctx.spotName ? `${clearance} · ${props.ctx.spotName}` : clearance
})

const peakfinderUrl = computed(() => result.value?.peakfinder_url ?? null)
const navigateUrl = computed(() =>
  `https://www.google.com/maps/dir/?api=1&destination=${props.ctx.lat},${props.ctx.lng}`)
</script>

<template>
  <div>
    <DockHeader eyebrow="Horizon view" :dot-var="verdictTone" :meta="props.ctx.spotName ? 'Spot' : 'Tap'" />

    <div class="title title--small" :data-tone="verdictTone">{{ titleText }}</div>
    <div v-if="subtitleText" class="subtitle">{{ subtitleText }}</div>

    <div class="chart">
      <svg viewBox="0 0 320 130" preserveAspectRatio="none" class="chart-svg">
        <!-- Y-axis grid + labels -->
        <line
          v-for="row in yGrid"
          :key="`y-${row.deg}`"
          :x1="0" :y1="Y_DEG_TO_PX(row.deg)"
          :x2="320" :y2="Y_DEG_TO_PX(row.deg)"
          stroke="rgb(255 255 255 / 0.08)"
          stroke-width="0.5"
          stroke-dasharray="2,3"
        />
        <text
          v-for="row in yGrid"
          :key="`yl-${row.deg}`"
          x="6" :y="Y_DEG_TO_PX(row.deg)"
          font-size="8"
          fill="rgb(232 229 220 / 0.42)"
          font-family="JetBrains Mono"
        >{{ row.label }}</text>

        <!-- Terrain (real DEM-derived) -->
        <template v-if="terrainPath && terrainFillPath">
          <path :d="terrainFillPath" fill="rgb(var(--totality))" fill-opacity="0.28" />
          <path :d="terrainPath" stroke="rgb(var(--totality))" stroke-width="1" fill="none" />
        </template>

        <!-- Sun arc (decorative, dashed) -->
        <path
          d="M 0 88 Q 160 30 320 70"
          stroke="rgb(var(--accent))"
          stroke-width="1"
          stroke-dasharray="2,2"
          fill="none"
          opacity="0.7"
        />

        <!-- Sun position dot + label -->
        <template v-if="sunPos">
          <circle :cx="sunPos.x" :cy="sunPos.y" r="5" fill="rgb(var(--accent))" />
          <text
            :x="sunPos.x + 8"
            :y="Math.max(10, sunPos.y - 2)"
            font-size="9"
            fill="rgb(var(--accent))"
            font-family="JetBrains Mono"
          >{{ sunPos.alt.toFixed(0) }}° SUN</text>
        </template>

        <!-- X-axis labels -->
        <text
          v-for="(t, i) in xLabels"
          :key="`xl-${i}`"
          :x="Math.max(8, Math.min(312, t.x))"
          y="124"
          font-size="8"
          fill="rgb(232 229 220 / 0.42)"
          font-family="JetBrains Mono"
          :text-anchor="i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'"
        >{{ t.label }}</text>

        <!-- Loading shimmer -->
        <text
          v-if="loading"
          x="160" y="68"
          font-size="11"
          fill="rgb(232 229 220 / 0.62)"
          font-family="JetBrains Mono"
          text-anchor="middle"
        >Loading…</text>
      </svg>
    </div>

    <div class="caption">ÍslandsDEM v1.0 · National Land Survey (CC BY 4.0)</div>

    <div class="actions">
      <a
        v-if="peakfinderUrl"
        class="btn-ghost btn-ghost--half"
        :href="peakfinderUrl"
        target="_blank"
        rel="noopener"
      >PEAKFINDER ↗</a>
      <span v-else class="btn-ghost btn-ghost--half btn-ghost--disabled">PEAKFINDER ↗</span>
      <a
        class="btn-ghost btn-ghost--half"
        :href="navigateUrl"
        target="_blank"
        rel="noopener"
      >NAVIGATE ↗</a>
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
  background: rgb(var(--surface) / 0.5);
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
</style>
