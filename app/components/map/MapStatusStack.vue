<script setup lang="ts">
import { useWeatherFreshness } from '~/composables/useWeatherFreshness'

const { t } = useI18n()
const props = defineProps<{
  /** ISO timestamp of the most recent cloud-cover refresh (`cloudData.fetched_at`). */
  weatherFetchedAt: string | null
  /** True when the cloud-cover endpoint is serving stale data. */
  weatherStale: boolean
  /** True while a manual refresh is in flight. */
  refreshing?: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

const { dot: weatherDot, statusLabel: weatherLabel } = useWeatherFreshness(
  () => props.weatherFetchedAt,
  () => props.weatherStale,
)
</script>

<template>
  <div class="status-stack" aria-live="polite">
    <div class="pill" data-kind="status" :data-tone="weatherDot">
      <span class="dot" :data-tone="weatherDot" />
      <span class="label">{{ weatherLabel }}</span>
      <button
        type="button"
        class="refresh-btn"
        :aria-label="t('map.weather_refresh', 'Refresh weather')"
        :disabled="refreshing"
        @click="emit('refresh')"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          :class="{ spinning: refreshing }"
        >
          <path d="M21 12a9 9 0 1 1-3.5-7.1" />
          <polyline points="21 4 21 10 15 10" />
        </svg>
      </button>
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
    /* Symmetric edge spacing: 24 px from both the top of the map (below
       the 60 px BrandBar) and the left edge. Mirrors the topright chip
       stack at top:84 / right:24. */
    top: 84px;
    left: 24px;
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

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  padding: 4px;
  border: none;
  background: transparent;
  color: rgb(var(--ink-1) / 0.62);
  border-radius: 99px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.refresh-btn:hover { color: rgb(var(--accent)); background: rgb(var(--accent) / 0.1); }
.refresh-btn:focus-visible { outline: 2px solid rgb(var(--accent)); outline-offset: 1px; }
.refresh-btn:disabled { cursor: default; opacity: 0.5; }

.spinning {
  animation: spin 0.8s linear infinite;
  transform-origin: center;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
