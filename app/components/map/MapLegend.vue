<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import WeatherIcon from '~/components/WeatherIcon.vue'

const { t } = useI18n()

defineProps<{
  legendItems: Array<{ label: string; cloudCover: number | null }>
  showTraffic: boolean
  showCameras: boolean
}>()

const STORAGE_KEY = 'ec-map-legend-open'
const open = ref(true)

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === '0') open.value = false
  } catch { /* localStorage unavailable; keep default */ }
})

function toggle() {
  open.value = !open.value
  try { localStorage.setItem(STORAGE_KEY, open.value ? '1' : '0') } catch { /* ignore */ }
}

const ariaLabel = computed(() => open.value ? t('map.collapse_legend') : t('map.expand_legend'))
</script>

<template>
  <div class="legend" :data-open="open">
    <button
      type="button"
      class="legend-toggle"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      aria-controls="map-legend-body"
      @click="toggle"
    >
      <span class="legend-toggle-label">{{ t('map.legend') }}</span>
      <span class="legend-toggle-chevron" aria-hidden="true">▴</span>
    </button>
    <div
      id="map-legend-body"
      class="legend-body"
      :aria-hidden="!open"
      :style="{
        maxHeight: open ? '70vh' : '0px',
        opacity: open ? 1 : 0,
        paddingTop: open ? '10px' : '0px',
        paddingBottom: open ? '12px' : '0px',
        borderTopColor: open ? undefined : 'transparent',
      }"
    >
      <div class="legend-section">
        <p class="legend-eyebrow">{{ t('map.cloud_cover') }}</p>
        <div class="legend-rows">
          <div v-for="item in legendItems" :key="item.label" class="legend-row">
            <WeatherIcon :cloud-cover="item.cloudCover" :size="20" class="shrink-0" />
            <span class="legend-row-label">{{ item.label }}</span>
          </div>
        </div>
      </div>

      <div class="legend-section legend-section--bordered">
        <div class="legend-row">
          <span class="dot dot--ring" />
          <span class="legend-row-label">{{ t('map.viewing_spot') }}</span>
        </div>
        <div class="legend-row">
          <span class="line line--dashed" />
          <span class="legend-row-label">{{ t('map.totality_path') }}</span>
        </div>
        <div class="legend-row">
          <span class="line line--solid" />
          <span class="legend-row-label">{{ t('map.centerline') }}</span>
        </div>
      </div>

      <div v-if="showTraffic" class="legend-section legend-section--bordered">
        <p class="legend-eyebrow">{{ t('map.road_conditions') }}</p>
        <div class="legend-row">
          <span class="line" style="border-color: #22c55e" />
          <span class="legend-row-label">{{ t('map.road_good') }}</span>
        </div>
        <div class="legend-row">
          <span class="line" style="border-color: #f97316" />
          <span class="legend-row-label">{{ t('map.road_difficult') }}</span>
        </div>
        <div class="legend-row">
          <span class="line" style="border-color: #ef4444" />
          <span class="legend-row-label">{{ t('map.road_closed') }}</span>
        </div>
        <p class="legend-eyebrow legend-eyebrow--inset">{{ t('map.road_warnings') }}</p>
        <div class="legend-row">
          <span class="dot dot--bordered" style="border-color: #f97316" />
          <span class="legend-row-label">{{ t('map.hazard') }}</span>
        </div>
        <div class="legend-row">
          <span class="dot dot--bordered" style="border-color: #ef4444" />
          <span class="legend-row-label">{{ t('map.closed') }}</span>
        </div>
        <div class="legend-row">
          <span class="dot dot--bordered" style="border-color: #6b7280" />
          <span class="legend-row-label">{{ t('map.other') }}</span>
        </div>
      </div>

      <div v-if="showCameras" class="legend-section legend-section--bordered">
        <div class="legend-row">
          <span class="dot dot--cam">
            <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none" />
              <circle cx="8" cy="8" r="2" fill="#7dd3fc" />
            </svg>
          </span>
          <span class="legend-row-label">{{ t('map.road_camera') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legend {
  /* Desktop-only chrome. Mobile uses the dock SPOT card for context. */
  display: none;
}
@media (min-width: 768px) {
  .legend {
    display: block;
    background: rgba(11, 14, 22, 0.92);
    background: rgb(var(--surface-raised, 11 14 22) / 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-color: rgb(var(--border-subtle, 255 255 255) / 0.4);
    border-radius: 6px;
    overflow: hidden;
    font-size: 12px;
    max-width: 240px;
  }
}
.legend-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 10px;
  color: rgb(var(--ink-3));
  transition: color 0.15s;
}
.legend-toggle:hover { color: rgb(var(--ink-2)); }
.legend-toggle:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
.legend-toggle-chevron {
  display: inline-block;
  font-size: 12px;
  line-height: 1;
  transition: transform 0.2s ease;
}
.legend[data-open='false'] .legend-toggle-chevron {
  transform: rotate(180deg);
}

.legend-body {
  max-height: 70vh;
  overflow: hidden;
  padding: 10px 12px 12px;
  opacity: 1;
  border-top: 1px solid rgb(var(--border-subtle) / 0.32);
  transition: max-height 0.22s ease, opacity 0.18s ease, padding 0.22s ease, border-color 0.22s ease;
}
.legend[data-open='false'] .legend-body {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  border-top-color: transparent;
}

.legend-section + .legend-section--bordered {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgb(var(--border-subtle) / 0.32);
}
.legend-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgb(var(--ink-3));
  margin: 0 0 8px;
}
.legend-eyebrow--inset { margin-top: 8px; }
.legend-rows { display: flex; flex-direction: column; gap: 6px; }
.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.legend-row:last-child { margin-bottom: 0; }
.legend-row-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgb(var(--ink-2));
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dot--ring {
  border: 2px solid rgb(var(--accent));
  background: rgb(var(--surface-raised));
  position: relative;
}
.dot--ring::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(var(--accent));
}
.dot--bordered {
  border: 2px solid currentColor;
  background: rgb(var(--surface-raised));
  width: 12px;
  height: 12px;
}
.dot--cam {
  width: 16px;
  height: 16px;
  border: 2px solid #7dd3fc;
  background: rgb(var(--surface-raised));
}
.line {
  display: inline-block;
  width: 18px;
  border-top: 2px solid rgb(var(--accent-strong) / 0.6);
  flex-shrink: 0;
}
.line--solid { border-top-width: 2px; }
.line--dashed {
  border-top-style: dashed;
  border-top-width: 1px;
  border-color: rgb(var(--accent) / 0.5);
}
</style>
