<script setup lang="ts">
import type { HorizonProfileData, HorizonSweepPoint } from '~/types/horizon'

const props = withDefaults(defineProps<{
  data: HorizonProfileData
  width?: number
  height?: number
  interactive?: boolean
}>(), {
  width: 700,
  height: 280,
  interactive: true,
})

const { t } = useI18n()

// Unique ID for SVG gradient to avoid collision when multiple instances render
const uid = useId()
const gradientId = `horizon-sky-${uid}`

// Layout constants
const PADDING = { top: 20, bottom: 30, left: 45, right: 20 }
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

// Sun position
const sunX = computed(() => azimuthToX(props.data.sun_azimuth))
const sunY = computed(() => altitudeToY(props.data.sun_altitude))

// Grid lines at 10° intervals (computed so they react to height prop changes)
const gridLines = computed(() => [10, 20, 30].map(alt => ({
  y: altitudeToY(alt),
  label: `${alt}°`,
})))

// Compass labels (show 3: left, center/sun, right)
const compassLabels = computed(() => {
  const center = props.data.sun_azimuth
  const offset = 25
  return [
    { azimuth: center - offset, label: `${Math.round(center - offset)}°` },
    { azimuth: center, label: `${Math.round(center)}° Sun`, highlight: true },
    { azimuth: center + offset, label: `${Math.round(center + offset)}°` },
  ]
})

// Verdict badge colors
const verdictColors: Record<string, string> = {
  clear: '#22c55e',
  marginal: '#eab308',
  risky: '#f97316',
  blocked: '#ef4444',
}

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
      <!-- Sky gradient -->
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
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
        stroke="#1e293b"
        stroke-width="0.5"
      />

      <!-- Altitude labels -->
      <text
        v-for="g in gridLines"
        :key="`label-${g.label}`"
        :x="PADDING.left - 5"
        :y="g.y + 4"
        fill="#64748b"
        font-size="10"
        text-anchor="end"
        font-family="'IBM Plex Mono', monospace"
      >{{ g.label }}</text>

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
      <path :d="terrainPath" fill="#1a2232" stroke="#334155" stroke-width="1" />

      <!-- Blocked zone overlay -->
      <path :d="blockedPath" fill="#ef444430" />

      <!-- Sun marker -->
      <circle :cx="sunX" :cy="sunY" r="12" fill="#f59e0b" opacity="0.15" />
      <circle :cx="sunX" :cy="sunY" r="6" fill="#f59e0b" opacity="0.9" />

      <!-- Sun label -->
      <text
        :x="sunX"
        :y="sunY - 18"
        fill="#f59e0b"
        font-size="10"
        text-anchor="middle"
        font-family="'IBM Plex Mono', monospace"
      >{{ data.sun_altitude.toFixed(0) }}°</text>

      <!-- Compass labels -->
      <text
        v-for="c in compassLabels"
        :key="c.azimuth"
        :x="azimuthToX(c.azimuth)"
        :y="height - 8"
        :fill="c.highlight ? '#f59e0b' : '#64748b'"
        font-size="10"
        text-anchor="middle"
        font-family="'IBM Plex Mono', monospace"
      >{{ c.label }}</text>

      <!-- Verdict badge -->
      <rect
        :x="width - 110"
        y="8"
        width="100"
        height="22"
        rx="11"
        :fill="`${verdictColors[data.verdict]}20`"
        :stroke="verdictColors[data.verdict]"
        stroke-width="1"
      />
      <text
        :x="width - 60"
        y="23"
        :fill="verdictColors[data.verdict]"
        font-size="11"
        text-anchor="middle"
        font-family="'IBM Plex Mono', monospace"
        font-weight="bold"
      >{{ data.verdict.toUpperCase() }}</text>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="tooltip && interactive"
      class="absolute pointer-events-none bg-void-surface border border-void-border/60 rounded px-2 py-1 text-xs font-mono text-slate-300 whitespace-nowrap z-10"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, transform: 'translate(-50%, -100%)' }"
    >
      {{ tooltip.text }}
    </div>

    <!-- Attribution -->
    <p class="mt-2 text-[10px] font-mono text-slate-600 text-right">
      {{ t('horizon.attribution') }}
    </p>
  </div>
</template>
