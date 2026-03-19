<script setup lang="ts">
import { cloudLevel } from '~/utils/eclipse'

const { t } = useI18n()

const props = defineProps<{
  forecasts: Array<{
    valid_time: string
    cloud_cover: number | null
    precip_prob?: number | null
  }>
}>()

// Eclipse event window (UTC) — broader than totality (17:43-17:48) to highlight the surrounding period
const ECLIPSE_START_UTC = 17 * 60 + 30 // 17:30
const ECLIPSE_END_UTC = 18 * 60 // 18:00

function formatHour(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function getMinutesUTC(isoString: string): number {
  const d = new Date(isoString)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

function isEclipseWindow(isoString: string): boolean {
  const mins = getMinutesUTC(isoString)
  return mins >= ECLIPSE_START_UTC && mins <= ECLIPSE_END_UTC
}

// Traffic-light color palette for the timeline chart (green=clear, red=overcast)
// Intentionally different from the blue-toned map marker palette in eclipse.ts
function timelineColor(cover: number | null): string {
  if (cover === null) return '#475569'
  if (cover <= 20) return '#22c55e'
  if (cover <= 40) return '#84cc16'
  if (cover <= 60) return '#f59e0b'
  if (cover <= 80) return '#f97316'
  return '#ef4444'
}

// Reuse labels from shared cloud cover levels
function cloudLabel(cover: number | null): string {
  return cloudLevel(cover).label
}
</script>

<template>
  <div v-if="forecasts.length > 0" class="space-y-1">
    <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
      {{ t('forecast.timeline_title') }}
    </p>

    <div class="flex gap-0.5 items-end h-12">
      <div
        v-for="fc in forecasts"
        :key="fc.valid_time"
        class="flex-1 min-w-0 relative group"
        :title="`${formatHour(fc.valid_time)}: ${fc.cloud_cover ?? '?'}% — ${cloudLabel(fc.cloud_cover)}`"
      >
        <!-- Bar -->
        <div
          class="w-full rounded-t transition-all"
          :class="isEclipseWindow(fc.valid_time) ? 'ring-1 ring-corona/50' : ''"
          :style="{
            height: `${Math.max((fc.cloud_cover ?? 50) / 100 * 40, 4)}px`,
            backgroundColor: timelineColor(fc.cloud_cover),
            opacity: fc.cloud_cover !== null ? 0.8 : 0.3,
          }"
        />
      </div>
    </div>

    <!-- Time labels (first, eclipse, last) -->
    <div class="flex justify-between text-[9px] font-mono text-slate-600">
      <span>{{ formatHour(forecasts[0].valid_time) }}</span>
      <span
        v-if="forecasts.some(f => isEclipseWindow(f.valid_time))"
        class="text-corona/70 flex items-center gap-0.5"
      >
        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" />
        </svg>
        {{ t('forecast.eclipse_window') }}
      </span>
      <span>{{ formatHour(forecasts[forecasts.length - 1].valid_time) }}</span>
    </div>

    <!-- Legend -->
    <div class="flex gap-3 text-[9px] font-mono text-slate-600 mt-1">
      <span class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500" />Clear
      </span>
      <span class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500" />Cloudy
      </span>
      <span class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-red-500" />Overcast
      </span>
    </div>
  </div>

  <div v-else class="text-xs font-mono text-slate-600">
    {{ t('forecast.no_data') }}
  </div>
</template>
