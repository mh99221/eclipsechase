<script setup lang="ts">
import type { HorizonProfileData, HorizonSweepPoint } from '~/types/horizon'
import { HORIZON_VERDICT_COLORS } from '~/utils/eclipse'
import { computeSunTrajectory, formatUtcTime } from '~/utils/solar'
import type { SunTrajectoryPoint } from '~/utils/solar'

const props = withDefaults(defineProps<{
  data: HorizonProfileData
  width?: number
  height?: number
  interactive?: boolean
  lat?: number
  lng?: number
}>(), {
  width: 700,
  height: 360,
  interactive: true,
})

const { t } = useI18n()

// Unique ID for SVG gradient to avoid collision when multiple instances render
const uid = useId()
const gradientId = `horizon-sky-${uid}`

// Layout constants — paddings sized for the 14-16px in-SVG text below.
// Left padding fits "30°" altitude labels; bottom fits a two-line azimuth
// label (degrees on top, "Sun" accent below). Top padding leaves room
// above the verdict pill + sun label so nothing collides at mobile sizes.
const PADDING = { top: 28, bottom: 48, left: 58, right: 24 }
const MAX_ALT = 35 // degrees shown on chart

const plotWidth = computed(() => props.width - PADDING.left - PADDING.right)
const plotHeight = computed(() => props.height - PADDING.top - PADDING.bottom)

const sweepRange = computed(() => {
  const azimuths = props.data.sweep.map(p => p.azimuth)
  return { min: Math.min(...azimuths), max: Math.max(...azimuths) }
})

function azimuthToX(azimuth: number): number {
  const range = sweepRange.value.max - sweepRange.value.min
  if (range === 0) return PADDING.left
  return PADDING.left + ((azimuth - sweepRange.value.min) / range) * plotWidth.value
}

function altitudeToY(altitude: number): number {
  const clamped = Math.min(Math.max(altitude, 0), MAX_ALT)
  return PADDING.top + plotHeight.value * (1 - clamped / MAX_ALT)
}

// Terrain silhouette path
const terrainPath = computed(() => {
  const sweep = props.data.sweep
  if (!sweep.length) return ''
  const points = sweep.map(p => `${azimuthToX(p.azimuth).toFixed(1)},${altitudeToY(Math.max(p.horizon_angle, 0)).toFixed(1)}`)
  const bottomY = altitudeToY(0).toFixed(1)
  const startX = azimuthToX(sweep[0]!.azimuth).toFixed(1)
  const endX = azimuthToX(sweep[sweep.length - 1]!.azimuth).toFixed(1)
  return `M ${startX},${bottomY} L ${points.join(' L ')} L ${endX},${bottomY} Z`
})

// Blocked overlay path — terrain above sun line, clipped
const blockedPath = computed(() => {
  const sweep = props.data.sweep
  const sunAlt = props.data.sun_altitude
  if (!sweep.length) return ''
  const points = sweep.map((p) => {
    const x = azimuthToX(p.azimuth).toFixed(1)
    const y = p.horizon_angle > sunAlt
      ? altitudeToY(p.horizon_angle).toFixed(1)
      : altitudeToY(sunAlt).toFixed(1)
    return `${x},${y}`
  })
  const sunY = altitudeToY(sunAlt).toFixed(1)
  const startX = azimuthToX(sweep[0]!.azimuth).toFixed(1)
  const endX = azimuthToX(sweep[sweep.length - 1]!.azimuth).toFixed(1)
  return `M ${startX},${sunY} L ${points.join(' L ')} L ${endX},${sunY} Z`
})

// Grid lines at 10° intervals (computed so they react to height prop changes)
const gridLines = computed(() => [10, 20, 30].map(alt => ({
  y: altitudeToY(alt),
  label: `${alt}°`,
})))

// Compass labels (show 5: edges, ±20°, center/sun)
const compassLabels = computed(() => {
  const center = props.data.sun_azimuth
  const { min, max } = sweepRange.value
  return [
    { azimuth: min + 2, label: `${Math.round(min)}°` },
    { azimuth: center - 20, label: `${Math.round(center - 20)}°` },
    { azimuth: center, label: `${Math.round(center)}° Sun`, highlight: true },
    { azimuth: center + 20, label: `${Math.round(center + 20)}°` },
    { azimuth: max - 2, label: `${Math.round(max)}°` },
  ]
})

// Sun trajectory for eclipse day
const sunTrajectory = computed<SunTrajectoryPoint[]>(() => {
  if (props.lat == null || props.lng == null) return []
  return computeSunTrajectory(props.lat, props.lng, sweepRange.value.min, sweepRange.value.max)
})

// Snap sun marker to trajectory so it sits exactly on the arc
const sunOnTrajectory = computed(() => {
  const pts = sunTrajectory.value
  if (!pts.length) return null
  let best = pts[0]!
  let bestDist = Math.abs(best.azimuth - props.data.sun_azimuth)
  for (const p of pts) {
    const d = Math.abs(p.azimuth - props.data.sun_azimuth)
    if (d < bestDist) { best = p; bestDist = d }
  }
  return best
})

// Sun position — snapped to trajectory arc, fallback to API values
const sunX = computed(() => {
  const t = sunOnTrajectory.value
  return t ? azimuthToX(t.azimuth) : azimuthToX(props.data.sun_azimuth)
})
const sunY = computed(() => {
  const t = sunOnTrajectory.value
  return t ? altitudeToY(t.altitude) : altitudeToY(props.data.sun_altitude)
})

// SVG path for the sun arc
const trajectoryPath = computed(() => {
  const pts = sunTrajectory.value
  if (pts.length < 2) return ''
  const segments = pts.map((p, i) => {
    const x = azimuthToX(p.azimuth).toFixed(1)
    const y = altitudeToY(Math.max(p.altitude, 0)).toFixed(1)
    return i === 0 ? `M ${x},${y}` : `L ${x},${y}`
  })
  return segments.join(' ')
})

// Time labels along the trajectory (show full hours only). Skip any
// label that would render under the sun marker (its outermost halo is
// r=18, so we leave a 22 px clearance on x). Labels too close to the
// sun get squashed beneath it because the sun is drawn last.
const trajectoryTimeLabels = computed(() => {
  const pts = sunTrajectory.value
  if (!pts.length) return []

  const sunCenterX = sunX.value
  const SUN_HALO_GUARD_PX = 22

  const labels: Array<{ x: number; y: number; label: string }> = []
  for (const p of pts) {
    // Show label at each full hour
    const minutes = Math.round(p.utcHours * 60)
    if (minutes % 60 !== 0) continue
    const x = azimuthToX(p.azimuth)
    const y = altitudeToY(Math.max(p.altitude, 0))
    // Skip if too close to edges
    if (x < PADDING.left + 20 || x > props.width - PADDING.right - 20) continue
    // Skip if the label would collide with the sun marker.
    if (Math.abs(x - sunCenterX) < SUN_HALO_GUARD_PX) continue
    labels.push({ x, y, label: formatUtcTime(p.utcHours) })
  }
  return labels
})

const verdictColors = HORIZON_VERDICT_COLORS

// Tooltip state
const tooltip = ref<{ x: number; y: number; text: string } | null>(null)

function onTerrainHover(event: MouseEvent) {
  if (!props.interactive) return
  const svg = (event.target as Element).closest('svg')
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const svgX = ((event.clientX - rect.left) / rect.width) * props.width
  // Find nearest sweep point
  const sweep = props.data.sweep
  let nearest: HorizonSweepPoint | null = null
  let nearestDist = Infinity
  for (const p of sweep) {
    const px = azimuthToX(p.azimuth)
    const d = Math.abs(px - svgX)
    if (d < nearestDist) {
      nearestDist = d
      nearest = p
    }
  }
  if (nearest) {
    tooltip.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top - 10,
      text: t('horizon.tooltip_terrain', {
        azimuth: nearest.azimuth.toFixed(0),
        angle: nearest.horizon_angle.toFixed(1),
        distance: Math.round(nearest.distance_m),
      }),
    }
  }
}

function clearTooltip() {
  tooltip.value = null
}

// Accessible description
const ariaLabel = computed(() => {
  const v = props.data.verdict
  const c = Math.abs(props.data.clearance_degrees).toFixed(1)
  if (v === 'clear') return `Horizon profile: clear view, sun is ${c} degrees above terrain`
  if (v === 'blocked') return `Horizon profile: view blocked, terrain is ${c} degrees above sun`
  return `Horizon profile: ${v} view, ${c} degrees clearance`
})
</script>

<template>
  <div class="relative w-full">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      class="w-full h-auto"
      :aria-label="ariaLabel"
      role="img"
      @mousemove="onTerrainHover"
      @mouseleave="clearTooltip"
    >
      <!-- Sky gradient — recolored per theme via .sky-* classes -->
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" class="sky-top" />
          <stop offset="100%" class="sky-bottom" />
        </linearGradient>
      </defs>
      <rect :width="width" :height="height" :fill="`url(#${gradientId})`" rx="4" />

      <!-- Grid lines -->
      <line
        v-for="g in gridLines"
        :key="g.label"
        :x1="PADDING.left"
        :y1="g.y"
        :x2="width - PADDING.right"
        :y2="g.y"
        class="grid-line"
        stroke-width="0.5"
      />

      <!-- Altitude labels -->
      <text
        v-for="g in gridLines"
        :key="`label-${g.label}`"
        :x="PADDING.left - 8"
        :y="g.y + 5"
        class="altitude-label"
        font-size="14"
        font-weight="500"
        text-anchor="end"
        font-family="'IBM Plex Mono', monospace"
      >{{ g.label }}</text>

      <!-- Sun trajectory arc (eclipse day) -->
      <path
        v-if="trajectoryPath"
        :d="trajectoryPath"
        fill="none"
        stroke="#fbbf24"
        stroke-width="1.5"
        stroke-dasharray="4 3"
        opacity="0.35"
      />
      <!-- Time labels along trajectory. Text uses --accent-strong so it
           stays legible on both the dark navy and light cream themes
           (amber-on-navy vs deep-orange-on-cream). Dot keeps amber. -->
      <template v-for="tl in trajectoryTimeLabels" :key="tl.label">
        <circle :cx="tl.x" :cy="tl.y" r="3" fill="#fbbf24" opacity="0.45" />
        <text
          :x="tl.x"
          :y="tl.y - 11"
          fill="rgb(var(--accent-strong))"
          font-size="12"
          font-weight="500"
          text-anchor="middle"
          font-family="'IBM Plex Mono', monospace"
          opacity="0.85"
        >{{ tl.label }}</text>
      </template>

      <!-- Sun altitude line (dashed) -->
      <line
        :x1="PADDING.left"
        :y1="sunY"
        :x2="width - PADDING.right"
        :y2="sunY"
        stroke="#f59e0b"
        stroke-width="1"
        stroke-dasharray="6 4"
        opacity="0.6"
      />

      <!-- Terrain silhouette -->
      <path :d="terrainPath" class="terrain" stroke-width="1" />

      <!-- Blocked zone overlay -->
      <path :d="blockedPath" fill="#ef444430" />

      <!-- Sun marker — halo, core, and a corona-pulse ring for emphasis -->
      <circle :cx="sunX" :cy="sunY" r="18" fill="#f59e0b" opacity="0.12" />
      <circle :cx="sunX" :cy="sunY" r="11" fill="#f59e0b" opacity="0.25" />
      <circle :cx="sunX" :cy="sunY" r="7" fill="#f59e0b" opacity="0.95" />

      <!-- Sun label -->
      <text
        :x="sunX"
        :y="sunY - 26"
        fill="rgb(var(--accent-strong))"
        font-size="14"
        font-weight="600"
        text-anchor="middle"
        font-family="'IBM Plex Mono', monospace"
      >{{ data.sun_altitude.toFixed(0) }}° Sun</text>

      <!-- Compass labels — degree on top line, optional "Sun" accent below -->
      <g v-for="c in compassLabels" :key="c.azimuth">
        <text
          :x="azimuthToX(c.azimuth)"
          :y="height - 24"
          :class="c.highlight ? 'compass-label-active' : 'compass-label'"
          font-size="14"
          :font-weight="c.highlight ? '700' : '500'"
          text-anchor="middle"
          font-family="'IBM Plex Mono', monospace"
        >{{ c.label.replace(' Sun', '') }}</text>
        <text
          v-if="c.highlight"
          :x="azimuthToX(c.azimuth)"
          :y="height - 8"
          class="compass-label-active"
          font-size="11"
          font-weight="600"
          letter-spacing="2"
          text-anchor="middle"
          font-family="'IBM Plex Mono', monospace"
        >SUN</text>
      </g>

      <!-- Verdict badge -->
      <rect
        :x="width - 150"
        y="10"
        width="136"
        height="32"
        rx="16"
        :fill="`${verdictColors[data.verdict]}22`"
        :stroke="verdictColors[data.verdict]"
        stroke-width="1.25"
      />
      <text
        :x="width - 82"
        y="31"
        :fill="verdictColors[data.verdict]"
        font-size="15"
        font-weight="700"
        letter-spacing="1.5"
        text-anchor="middle"
        font-family="'IBM Plex Mono', monospace"
      >{{ data.verdict.toUpperCase() }}</text>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="tooltip && interactive"
      class="absolute pointer-events-none bg-surface-raised border border-border-subtle/60 rounded px-2 py-1 text-xs font-mono text-ink-2 whitespace-nowrap z-10"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, transform: 'translate(-50%, -100%)' }"
    >
      {{ tooltip.text }}
    </div>

    <!-- Attribution -->
    <p class="mt-2 text-[10px] font-mono text-ink-3/70 text-right">
      {{ t('horizon.attribution') }}
    </p>
  </div>
</template>

<style scoped>
/* Horizon SVG — theme-aware styling via shared tokens (main.css) plus
   a few HorizonProfile-specific labels. Dark mode keeps the deep-space
   sky; light mode uses a soft dawn gradient. */
.sky-top    { stop-color: rgb(var(--horizon-sky-top)); }
.sky-bottom { stop-color: rgb(var(--horizon-sky-bottom)); }
.terrain    {
  fill:   rgb(var(--horizon-terrain-fill));
  stroke: rgb(var(--horizon-terrain-stroke));
}
.compass-label-active { fill: rgb(var(--horizon-accent)); }

/* HorizonProfile-specific: this chart is large (700×360 default) so the
   labels and grid use slightly darker slate than DockHorizon's smaller
   chart can afford. */
.grid-line                { stroke: #1e293b; }
.altitude-label,
.compass-label            { fill: #64748b; }
html.light .grid-line     { stroke: rgba(42, 31, 20, 0.08); }
html.light .altitude-label,
html.light .compass-label { fill: #8b7d7d; }

/* Halo for in-chart text — keeps labels legible even if a future
   element overlaps them (e.g. trajectory time tick getting close to a
   compass label). `paint-order: stroke` paints the stroke first so the
   fill sits crisply on top of a soft scrim. */
svg text {
  paint-order: stroke fill;
  stroke: rgb(var(--horizon-sky-bottom) / 0.55);
  stroke-width: 3px;
  stroke-linejoin: round;
}
</style>
