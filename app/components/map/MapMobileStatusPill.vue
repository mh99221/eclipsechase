<script setup lang="ts">
import { computed } from 'vue'
import { ESTIMATED_TILE_COUNT } from '~/utils/offlineTiles'
import { useWeatherFreshness } from '~/composables/useWeatherFreshness'

const { t } = useI18n()
const { tileCount } = useOfflineStatus()

const props = defineProps<{
  /** ISO timestamp of the most recent cloud-cover refresh (`cloudData.fetched_at`). */
  weatherFetchedAt: string | null
  /** True when the cloud-cover endpoint is serving stale data. */
  weatherStale: boolean
}>()

const emit = defineEmits<{ open: [] }>()

const { ageMin, dot: weatherDot, shortLabel: weatherLabel } = useWeatherFreshness(
  () => props.weatherFetchedAt,
  () => props.weatherStale,
)

const tilePct = computed(() =>
  ESTIMATED_TILE_COUNT > 0 ? Math.min(100, Math.round((tileCount.value / ESTIMATED_TILE_COUNT) * 100)) : 0,
)
const tileDot = computed<'good' | 'warn' | 'bad' | 'idle'>(() => {
  const p = tilePct.value
  if (p >= 80) return 'good'
  if (p >= 25) return 'warn'
  if (p > 0) return 'bad'
  return 'idle'
})
const tileLabel = computed(() => tilePct.value > 0 ? `${tilePct.value}%` : '—')

const ariaLabel = computed(() => {
  const wPart = ageMin.value == null
    ? t('map.weather_loading')
    : t('map.weather_updated_ago', { minutes: ageMin.value })
  const tPart = tilePct.value > 0
    ? `${tilePct.value}% offline tiles cached`
    : 'No offline tiles cached'
  return `${wPart}. ${tPart}. Tap for details.`
})
</script>

<template>
  <button
    type="button"
    class="status-pill"
    :aria-label="ariaLabel"
    @click="emit('open')"
  >
    <span class="seg" :data-tone="weatherDot">
      <span class="dot" :data-tone="weatherDot" />
      <span class="seg-text">{{ weatherLabel }}</span>
    </span>
    <span class="divider" aria-hidden="true" />
    <span class="seg" :data-tone="tileDot">
      <svg
        class="tile-icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 11.5v2A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-2" />
        <path d="M8 2v8.5" />
        <path d="M5 7.5 8 10.5l3-3" />
      </svg>
      <span class="seg-text">{{ tileLabel }}</span>
    </span>
  </button>
</template>

<style scoped>
.status-pill {
  /* Mobile-only. Anchored just below the chip stack (top:72 + ~70px
     stack height) so it never collides with horizontally-scrolling
     chip rows. Hidden on tablet+; desktop has MapStatusStack +
     MapOfflineCard for the same data. */
  position: absolute;
  top: 150px;
  right: 12px;
  z-index: 9;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 11px 6px 9px;
  border: 1px solid rgb(var(--border-subtle, 255 255 255) / 0.16);
  border-radius: 99px;
  background: rgb(var(--map-pane-strong, 15 23 42) / 0.86);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: rgb(var(--ink-1) / 0.82);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.12s;
}
.status-pill:hover {
  background: rgb(var(--map-pane-strong) / 0.96);
  border-color: rgb(var(--accent) / 0.4);
}
.status-pill:active {
  transform: scale(0.97);
}
.status-pill:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
@media (min-width: 768px) {
  .status-pill { display: none; }
}

.seg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  line-height: 1;
  white-space: nowrap;
}
.seg-text {
  font-variant-numeric: tabular-nums;
  min-width: 1.5em;
  text-align: right;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgb(var(--accent));
}
.dot[data-tone='good'] { background: rgb(var(--good)); }
.dot[data-tone='warn'] { background: rgb(var(--warn)); }
.dot[data-tone='bad']  {
  background: rgb(var(--bad));
  box-shadow: 0 0 0 3px rgb(var(--bad) / 0.18);
}

.tile-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: rgb(var(--ink-3));
  transition: color 0.15s;
}
.seg[data-tone='good'] .tile-icon { color: rgb(var(--good)); }
.seg[data-tone='warn'] .tile-icon { color: rgb(var(--warn)); }
.seg[data-tone='bad']  .tile-icon { color: rgb(var(--bad)); }

.divider {
  width: 1px;
  height: 14px;
  background: rgb(var(--border-subtle) / 0.22);
  flex-shrink: 0;
}
</style>
