<script setup lang="ts">
/**
 * Big verdict card at the top of /check results. Three shapes:
 *   - Inside totality + horizon known: "CLEAR / MARGINAL / RISKY / BLOCKED"
 *   - Inside totality + horizon unknown: "INSIDE PATH" + caveat
 *   - Outside totality: "OUTSIDE PATH" + how far from path
 */
import type { CheckResult } from '~/types/check'
import { HORIZON_VERDICT_STYLES, formatDuration, compassDirection } from '~/utils/eclipse'

const props = defineProps<{ result: CheckResult }>()

const verdictStyle = computed(() => {
  const v = props.result.horizon.verdict
  if (v === 'unknown') return null
  return HORIZON_VERDICT_STYLES[v] ?? null
})

function fmtCoord(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? 'N' : 'S'}`
  const lngStr = `${Math.abs(lng).toFixed(5)}°${lng >= 0 ? 'E' : 'W'}`
  return `${latStr}, ${lngStr}`
}
</script>

<template>
  <section class="space-y-3">
    <!-- Inside path: show horizon verdict if known -->
    <div
      v-if="result.totality.insidePath && verdictStyle"
      class="rounded border-2 p-5 sm:p-6"
      :class="[verdictStyle.bg, verdictStyle.border]"
    >
      <div class="flex items-center gap-3 mb-2">
        <span
          class="w-3.5 h-3.5 rounded-full flex-shrink-0"
          :style="{ backgroundColor: verdictStyle.color }"
        />
        <h2
          class="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight"
          :style="{ color: verdictStyle.color }"
        >
          {{ result.horizon.verdict }}
        </h2>
        <span
          v-if="result.horizon.clearanceDegrees != null"
          class="font-mono text-sm text-ink-2 ml-auto"
        >
          {{ Math.abs(result.horizon.clearanceDegrees).toFixed(1) }}° clearance
        </span>
      </div>
      <p class="font-mono text-xs text-ink-3 tracking-wider mb-3">
        {{ fmtCoord(result.input.lat, result.input.lng) }}
      </p>
      <p class="text-ink-2">
        Inside the path of totality.
        <span v-if="result.totality.durationSeconds != null" class="text-ink-1 font-semibold">
          {{ formatDuration(result.totality.durationSeconds) }} of totality
        </span>
        at this location.
      </p>
    </div>

    <!-- Inside path but no horizon coverage -->
    <div
      v-else-if="result.totality.insidePath && !verdictStyle"
      class="rounded border-2 border-accent/40 bg-accent-soft/30 p-5 sm:p-6"
    >
      <div class="flex items-baseline gap-3 mb-2">
        <h2 class="font-display text-2xl sm:text-3xl font-bold uppercase text-ink-1">
          Inside path
        </h2>
        <span class="font-mono text-xs text-ink-3 ml-auto">No horizon data</span>
      </div>
      <p class="font-mono text-xs text-ink-3 tracking-wider mb-3">
        {{ fmtCoord(result.input.lat, result.input.lng) }}
      </p>
      <p class="text-ink-2">
        This point is inside the totality path
        <span v-if="result.totality.durationSeconds != null" class="text-ink-1">
          ({{ formatDuration(result.totality.durationSeconds) }})
        </span>
        but it's outside the pre-computed horizon grid (mostly western Iceland).
        We can't tell whether terrain blocks the low sun here.
      </p>
    </div>

    <!-- Outside path -->
    <div
      v-else
      class="rounded border-2 border-border-subtle/60 bg-surface p-5 sm:p-6"
    >
      <div class="flex items-baseline gap-3 mb-2">
        <h2 class="font-display text-2xl sm:text-3xl font-bold uppercase text-ink-1">
          Outside path
        </h2>
      </div>
      <p class="font-mono text-xs text-ink-3 tracking-wider mb-3">
        {{ fmtCoord(result.input.lat, result.input.lng) }}
      </p>
      <p class="text-ink-2">
        These coordinates fall outside the path of totality.
        <span v-if="result.totality.distanceFromNearestPointMeters != null && result.totality.nearestGridLat != null">
          The nearest grid point inside the path is
          <span class="text-ink-1 font-semibold">
            {{ Math.round(result.totality.distanceFromNearestPointMeters / 1000) }} km
            {{ compassDirection(
              Math.atan2(
                (result.totality.nearestGridLng ?? 0) - result.input.lng,
                (result.totality.nearestGridLat ?? 0) - result.input.lat,
              ) * 180 / Math.PI,
            ) }}.
          </span>
        </span>
        You'll see a deep partial eclipse here — interesting, but not totality.
      </p>
    </div>
  </section>
</template>
