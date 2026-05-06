<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import OfflineManager from '~/components/OfflineManager.vue'

const { t } = useI18n()

const props = defineProps<{
  /** Mapbox map instance forwarded to OfflineManager. */
  map: any
}>()

const emit = defineEmits<{
  downloading: [active: boolean]
  progress: [payload: { loaded: number; total: number }]
}>()

const STORAGE_KEY = 'ec-map-offline-open'
// Collapsed by default — the OfflineManager UI is large and only relevant
// when the user is actively prepping for offline use. Persisted toggle
// state still wins on subsequent loads.
const open = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === '1') open.value = true
  } catch { /* localStorage unavailable; keep default */ }
})

function toggle() {
  open.value = !open.value
  try { localStorage.setItem(STORAGE_KEY, open.value ? '1' : '0') } catch { /* ignore */ }
}

const ariaLabel = computed(() => open.value ? t('map.collapse_offline') : t('map.expand_offline'))

const offlineManagerRef = ref<any>(null)

defineExpose({
  /** Forward to underlying OfflineManager so the page can call cancel() during download overlay. */
  cancel: () => offlineManagerRef.value?.cancel?.(),
  isDownloading: computed(() => offlineManagerRef.value?.isDownloading ?? false),
  loadedTiles: computed(() => offlineManagerRef.value?.loadedTiles ?? 0),
  totalTiles: computed(() => offlineManagerRef.value?.totalTiles ?? 0),
  progress: computed(() => offlineManagerRef.value?.progress ?? 0),
})
</script>

<template>
  <div class="offline-card" :data-open="open">
    <button
      type="button"
      class="offline-toggle"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      aria-controls="map-offline-body"
      @click="toggle"
    >
      <span class="offline-toggle-label">{{ t('map.offline_maps') }}</span>
      <span class="offline-toggle-chevron" aria-hidden="true">▴</span>
    </button>
    <div
      id="map-offline-body"
      class="offline-body"
      :aria-hidden="!open"
      :style="{
        maxHeight: open ? '70vh' : '0px',
        opacity: open ? 1 : 0,
        paddingTop: open ? '0px' : '0px',
        paddingBottom: open ? '0px' : '0px',
        borderTopColor: open ? undefined : 'transparent',
      }"
    >
      <OfflineManager
        ref="offlineManagerRef"
        :map="map"
        @downloading="emit('downloading', $event)"
        @progress="emit('progress', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.offline-card {
  display: none;
}
@media (min-width: 768px) {
  .offline-card {
    display: block;
    background: rgba(11, 14, 22, 0.92);
    background: rgb(var(--surface-raised, 11 14 22) / 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-color: rgb(var(--border-subtle, 255 255 255) / 0.4);
    border-radius: 6px;
    overflow: hidden;
    width: 256px;
  }
}
.offline-toggle {
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
.offline-toggle:hover { color: rgb(var(--ink-2)); }
.offline-toggle:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
.offline-toggle-chevron {
  display: inline-block;
  font-size: 12px;
  line-height: 1;
  transition: transform 0.2s ease;
}
.offline-card[data-open='false'] .offline-toggle-chevron {
  transform: rotate(180deg);
}
.offline-body {
  max-height: 70vh;
  overflow: hidden;
  opacity: 1;
  border-top: 1px solid rgb(var(--border-subtle) / 0.32);
  transition: max-height 0.22s ease, opacity 0.18s ease, border-color 0.22s ease;
}
.offline-card[data-open='false'] .offline-body {
  max-height: 0;
  opacity: 0;
  border-top-color: transparent;
}
/* OfflineManager renders its own bordered card; flatten it inside our
   collapsible wrapper so the chrome flows seamlessly. */
.offline-body :deep(.bg-surface-raised) {
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 12px 14px 14px;
}
/* Inner "OFFLINE MAPS" eyebrow (offline.title) — duplicate of our toggle label. */
.offline-body :deep(.bg-surface-raised > div > p:first-child) {
  display: none;
}
/* Inner X dismiss button — superseded by our collapse toggle. */
.offline-body :deep(button[aria-label='Close']) {
  display: none;
}
</style>
