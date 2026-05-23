<script setup lang="ts">
/**
 * Result hero for /check — eyebrow + big coord heading. In-path
 * locations get just the coords; outside-path adds a "X km Y from
 * the totality path" one-liner and a neutral pill.
 */
import type { CheckResult } from '~/types/check'
import { compassDirection, formatLatLng } from '~/utils/eclipse'

const props = defineProps<{ result: CheckResult }>()

const insidePath = computed(() => props.result.totality.insidePath)
const coordLine = computed(() => formatLatLng(props.result.input.lat, props.result.input.lng))

const distanceToPath = computed(() => {
  const m = props.result.totality.distanceFromNearestPointMeters
  if (m == null) return null
  return Math.round(m / 1000)
})

const bearingToPath = computed(() => {
  const r = props.result
  if (r.totality.nearestGridLat == null || r.totality.nearestGridLng == null) return null
  // atan2 in lat/lng space is rough but plenty for "south-ish" copy.
  const dLat = r.totality.nearestGridLat - r.input.lat
  const dLng = r.totality.nearestGridLng - r.input.lng
  const az = (Math.atan2(dLng, dLat) * 180) / Math.PI
  return compassDirection((az + 360) % 360)
})
</script>

<template>
  <header class="check-hero">
    <div class="check-hero-kicker-row">
      <span class="check-hero-kicker">● COORDINATE CHECK</span>
      <span v-if="!insidePath" class="check-hero-pill" data-tone="dim">Outside path</span>
    </div>

    <h1 class="check-hero-coords">{{ coordLine }}</h1>

    <p v-if="!insidePath && distanceToPath != null && bearingToPath" class="check-hero-meta">
      <span class="check-hero-meta-strong">{{ distanceToPath }} km {{ bearingToPath }}</span>
      from the totality path
    </p>
  </header>
</template>

<style scoped>
.check-hero {
  padding: 4px 0 8px;
}
.check-hero-kicker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  min-height: 22px;
}
.check-hero-kicker {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: rgb(var(--accent));
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.check-hero-pill {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 99px;
  border: 1px solid rgb(var(--border-subtle) / 0.18);
}
.check-hero-pill[data-tone='warn'] {
  color: rgb(var(--warn));
  border-color: rgb(var(--warn) / 0.32);
  background: rgb(var(--warn) / 0.08);
}
.check-hero-pill[data-tone='dim'] {
  color: rgb(var(--ink-1) / 0.62);
}
.check-hero-coords {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: rgb(var(--ink-1));
  margin: 0;
  font-variant-numeric: tabular-nums;
}
@media (min-width: 640px) {
  .check-hero-coords { font-size: 34px; }
}
.check-hero-meta {
  margin-top: 10px;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.78);
}
.check-hero-meta-strong {
  color: rgb(var(--ink-1));
  font-weight: 600;
}
</style>
