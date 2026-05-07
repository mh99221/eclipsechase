<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import OfflineManager from '~/components/OfflineManager.vue'
import { useWeatherFreshness } from '~/composables/useWeatherFreshness'

const { t } = useI18n()
const { isOffline } = useOfflineStatus()

const props = defineProps<{
  open: boolean
  /** Mapbox map instance forwarded to OfflineManager. */
  map: any
  /** ISO timestamp of the most recent cloud-cover refresh. */
  weatherFetchedAt: string | null
  /** True when the cloud-cover endpoint is serving stale data. */
  weatherStale: boolean
}>()

const emit = defineEmits<{
  close: []
  downloading: [active: boolean]
  progress: [payload: { loaded: number; total: number }]
}>()

const offlineManagerRef = ref<any>(null)

defineExpose({
  cancel: () => offlineManagerRef.value?.cancel?.(),
})

const { dot: weatherDot, statusLabel: weatherStatus } = useWeatherFreshness(
  () => props.weatherFetchedAt,
  () => props.weatherStale,
)

const weatherTimestamp = computed(() => {
  if (!props.weatherFetchedAt) return null
  const d = new Date(props.weatherFetchedAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
})

// ── Drag-to-dismiss ────────────────────────────────────────────────
const dragY = ref(0)
const dragging = ref(false)
const startY = ref(0)

function onDragStart(e: TouchEvent) {
  dragging.value = true
  startY.value = e.touches[0]!.clientY
  dragY.value = 0
}
function onDragMove(e: TouchEvent) {
  if (!dragging.value) return
  const dy = e.touches[0]!.clientY - startY.value
  // Only allow dragging downward.
  dragY.value = Math.max(0, dy)
}
function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (dragY.value > 80) emit('close')
  else dragY.value = 0
}

// Close on Escape and lock body scroll while open.
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}
watch(() => props.open, (isOpen) => {
  if (typeof document === 'undefined') return
  if (isOpen) {
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    dragY.value = 0
  } else {
    document.removeEventListener('keydown', onKeyDown)
    document.body.style.overflow = ''
  }
})
onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onKeyDown)
    document.body.style.overflow = ''
  }
})

const sheetTransform = computed(() => dragging.value ? `translateY(${dragY.value}px)` : undefined)
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="open"
        class="status-sheet-root"
        role="dialog"
        aria-modal="true"
        :aria-label="t('map.system_status')"
      >
        <div class="backdrop" @click="emit('close')" />
        <div
          class="sheet"
          :style="{ transform: sheetTransform }"
          :class="{ dragging }"
        >
          <!-- Drag handle -->
          <div
            class="handle-zone"
            @touchstart.passive="onDragStart"
            @touchmove.passive="onDragMove"
            @touchend="onDragEnd"
            @touchcancel="onDragEnd"
          >
            <div class="handle" aria-hidden="true" />
          </div>

          <header class="sheet-header">
            <p class="eyebrow">{{ t('map.system_status') }}</p>
            <button
              class="close-btn"
              type="button"
              :aria-label="t('map.close')"
              @click="emit('close')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div class="sheet-body">
            <!-- Weather freshness section -->
            <section class="status-block">
              <div class="status-row">
                <span class="status-dot" :data-tone="weatherDot" />
                <div class="status-text">
                  <p class="status-title">{{ weatherStatus }}</p>
                  <p v-if="weatherTimestamp" class="status-meta">
                    {{ t('map.weather_source_at', { time: weatherTimestamp }) }}
                  </p>
                  <p v-else class="status-meta">{{ t('map.weather_source') }}</p>
                </div>
              </div>
              <p v-if="isOffline" class="offline-note">
                {{ t('map.offline_note') }}
              </p>
            </section>

            <!-- Offline maps section — full OfflineManager UI -->
            <section class="offline-block">
              <p class="block-eyebrow">{{ t('offline.title') }}</p>
              <OfflineManager
                ref="offlineManagerRef"
                :map="map"
                embedded
                @downloading="emit('downloading', $event)"
                @progress="emit('progress', $event)"
              />
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.status-sheet-root {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 12, 0.58);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
.sheet {
  position: relative;
  width: 100%;
  max-width: 520px;
  background: rgb(var(--bg-elevated, 11 14 22));
  border-top: 1px solid rgb(var(--border-subtle) / 0.18);
  border-radius: 18px 18px 0 0;
  box-shadow: 0 -12px 40px -12px rgba(0, 0, 0, 0.6);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding-bottom: max(env(safe-area-inset-bottom), 16px);
  transition: transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.sheet.dragging { transition: none; }

/* Tablet+: float as a card centered above the bottom edge. */
@media (min-width: 640px) {
  .status-sheet-root { align-items: center; }
  .sheet {
    border-radius: 14px;
    border: 1px solid rgb(var(--border-subtle) / 0.18);
    margin: 24px;
  }
}

.handle-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0 4px;
  cursor: grab;
  flex-shrink: 0;
}
.handle {
  width: 38px;
  height: 4px;
  border-radius: 99px;
  background: rgb(var(--ink-3) / 0.36);
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 18px 12px;
  flex-shrink: 0;
}
.eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--ink-3));
  margin: 0;
}
.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 99px;
  background: transparent;
  color: rgb(var(--ink-3));
  border: 1px solid rgb(var(--border-subtle) / 0.16);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.close-btn:hover {
  color: rgb(var(--ink-1));
  border-color: rgb(var(--border-subtle) / 0.32);
  background: rgb(var(--surface) / 0.5);
}
.close-btn:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}

.sheet-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0 18px 8px;
  overflow-y: auto;
}

.status-block {
  border: 1px solid rgb(var(--border-subtle) / 0.14);
  border-radius: 10px;
  background: rgb(var(--surface) / 0.55);
  padding: 14px 14px;
}
.status-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  background: rgb(var(--accent));
}
.status-dot[data-tone='good'] { background: rgb(var(--good)); }
.status-dot[data-tone='warn'] { background: rgb(var(--warn)); }
.status-dot[data-tone='bad']  {
  background: rgb(var(--bad));
  box-shadow: 0 0 0 4px rgb(var(--bad) / 0.18);
}
.status-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.status-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0;
  letter-spacing: -0.005em;
}
.status-meta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: rgb(var(--ink-3));
  margin: 0;
}
.offline-note {
  margin: 10px 0 0;
  padding-top: 10px;
  border-top: 1px solid rgb(var(--border-subtle) / 0.14);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgb(var(--warn));
  letter-spacing: 0.02em;
}

.offline-block { display: flex; flex-direction: column; gap: 8px; }
.block-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--ink-3));
  margin: 0 2px;
}

/* ── Sheet enter/leave ── */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.18s ease;
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.24s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.sheet-enter-from { opacity: 0; }
.sheet-enter-from .sheet { transform: translateY(100%); }
.sheet-leave-to { opacity: 0; }
.sheet-leave-to .sheet { transform: translateY(100%); }
</style>
