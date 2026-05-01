<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  /** ISO timestamp of the most recent cloud-cover refresh (`cloudData.fetched_at`). */
  weatherFetchedAt: string | null
  /** True when the cloud-cover endpoint is serving stale data. */
  weatherStale: boolean
}>()

// Re-tick once a minute so "N min ago" updates without polling.
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 60_000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

const weatherAgeMin = computed<number | null>(() => {
  if (!props.weatherFetchedAt) return null
  const ts = new Date(props.weatherFetchedAt).getTime()
  if (Number.isNaN(ts)) return null
  return Math.max(0, Math.floor((now.value - ts) / 60_000))
})

const weatherDot = computed<'good' | 'warn' | 'bad'>(() => {
  if (props.weatherStale) return 'bad'
  const m = weatherAgeMin.value
  if (m == null) return 'warn'
  if (m <= 30) return 'good'
  if (m <= 90) return 'warn'
  return 'bad'
})

const weatherLabel = computed(() => {
  if (props.weatherStale) return t('map.weather_stale')
  const m = weatherAgeMin.value
  if (m == null) return t('map.weather_loading')
  if (m < 1) return t('map.weather_just_now')
  return t('map.weather_updated_ago', { minutes: m })
})
</script>

<template>
  <div class="status-stack" aria-live="polite">
    <div class="pill" data-kind="status" :data-tone="weatherDot">
      <span class="dot" :data-tone="weatherDot" />
      <span class="label">{{ weatherLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.status-stack {
  /* Desktop-only — mobile uses the chip stack and dock instead. */
  display: none;
}
@media (min-width: 768px) {
  .status-stack {
    position: absolute;
    /* Top-left corner of the map area (mirrors the topright chip stack).
       Sits above the rail (z-index 11 vs rail's 10) so the pill floats
       over the rail's top-left without being clipped. */
    top: 74px;
    left: 14px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    z-index: 11;
  }
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px 7px 10px;
  border-radius: 99px;
  background: rgba(15, 23, 42, 0.86);
  background: rgb(var(--map-pane-strong, 15 23 42) / 0.86);
  border: 1px solid rgb(var(--border-subtle, 255 255 255) / 0.16);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.045em;
  color: rgb(var(--ink-1) / 0.78);
  white-space: nowrap;
  cursor: default;
}
.pill[data-kind='action'] {
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.pill[data-kind='action']:hover {
  background: rgb(var(--map-pane-strong) / 0.96);
  border-color: rgb(var(--accent) / 0.4);
}
.pill[data-kind='action']:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgb(var(--accent));
}
.dot[data-tone='good'] { background: rgb(var(--good)); }
.dot[data-tone='warn'] { background: rgb(var(--warn)); }
.dot[data-tone='bad']  { background: rgb(var(--bad));  box-shadow: 0 0 0 3px rgb(var(--bad) / 0.16); }
.label {
  display: inline-block;
}
</style>
