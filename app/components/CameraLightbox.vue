<script setup lang="ts">
interface LightboxImage { url: string; description: string }
interface LightboxCamera { id: string; name: string; images: LightboxImage[] }

const props = defineProps<{ camera: LightboxCamera | null; startIndex?: number }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { t } = useI18n()
const currentIndex = ref(0)

// Reset index whenever a new camera is opened, honoring the caller's
// preferred starting frame (e.g. the popup's current carousel position).
watch(() => props.camera?.id, () => { currentIndex.value = props.startIndex ?? 0 })

const images = computed(() => props.camera?.images ?? [])
const current = computed(() => images.value[currentIndex.value] ?? null)
const hasMultiple = computed(() => images.value.length > 1)

function next() {
  if (!images.value.length) return
  currentIndex.value = (currentIndex.value + 1) % images.value.length
}
function prev() {
  if (!images.value.length) return
  currentIndex.value = (currentIndex.value - 1 + images.value.length) % images.value.length
}
function close() { emit('close') }

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) close()
}

function onKeydown(e: KeyboardEvent) {
  if (!props.camera) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}

onMounted(() => { document.addEventListener('keydown', onKeydown) })
onUnmounted(() => { document.removeEventListener('keydown', onKeydown) })
</script>

<template>
  <Transition name="fade">
    <div
      v-if="camera && current"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="`${camera.name} lightbox`"
      @click="handleBackdropClick"
    >
      <!-- Top bar -->
      <div class="topbar">
        <div class="title-row">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5" fill="none" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
          <span class="title">{{ camera.name }}</span>
          <span class="eyebrow">{{ t('map_extra.cam_label') }}</span>
        </div>
        <button class="close-btn" @click="close">{{ t('map.close') }}</button>
      </div>

      <!-- Image -->
      <div class="frame">
        <img
          :src="current.url"
          :alt="current.description"
          class="frame-img"
        >
        <template v-if="hasMultiple">
          <button
            class="step step--prev"
            aria-label="Previous image"
            @click.stop="prev"
          >&#8249;</button>
          <button
            class="step step--next"
            aria-label="Next image"
            @click.stop="next"
          >&#8250;</button>
        </template>
      </div>

      <!-- Bottom info -->
      <div class="bottom">
        <div class="caption">{{ current.description || '' }}</div>
        <div v-if="hasMultiple" class="dots-row">
          <span
            v-for="(_, i) in images"
            :key="i"
            class="dot"
            :data-active="i === currentIndex"
          />
          <span class="counter" aria-live="polite">
            {{ currentIndex + 1 }}/{{ images.length }}
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Cinema-dark palette — this lightbox stays dark in both themes since it's
   a full-screen surround for road-camera footage (often dim/night roads
   where dark chrome maximises contrast, matching DockCam's cam-frame).
   Surfaces use dark-pinned `--glass-*` tokens; ink + border are pinned
   locally so cream chrome stays readable when the rest of the app is in
   the cream "Dawn Horizon" theme. The active carousel dot keeps `--accent`
   (theme-aware amber/burnt-amber) so the HUD signal echoes the DockCam
   active-dot pattern. */
.lightbox {
  --cl-ink:    232 229 220;   /* cream — same as dark-theme --ink-1 */
  --cl-border: 232 229 220;   /* used with /0.16 alpha              */

  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  cursor: default;
  background: radial-gradient(
    ellipse at 50% 0%,
    rgb(var(--glass) / 0.92) 0%,
    rgb(var(--glass-strong) / 1) 70%
  );
}

.topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgb(var(--cl-ink));
}
.title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-weight: 600;
  font-size: 16px;
}
.eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgb(var(--cl-ink) / 0.42);
}
.close-btn {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 4px;
  background: rgb(var(--glass-strong) / 0.85);
  border: 1px solid rgb(var(--cl-border) / 0.16);
  color: rgb(var(--cl-ink) / 0.62);
  cursor: pointer;
  transition: color 0.15s;
}
.close-btn:hover { color: rgb(var(--cl-ink)); }

.frame {
  position: relative;
  max-width: 90vw;
  max-height: 70vh;
}
.frame-img {
  display: block;
  max-width: 90vw;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid rgb(var(--cl-border) / 0.16);
}
/* Carousel arrows — ghost-button family matching DockCam .step. */
.step {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid rgb(var(--cl-border) / 0.16);
  background: rgb(var(--glass-strong) / 0.8);
  color: rgb(var(--cl-ink));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 20px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.15s;
}
.step:hover { background: rgb(var(--glass-strong) / 0.95); }
.step--prev { left: 8px; }
.step--next { right: 8px; }

.bottom {
  margin-top: 16px;
  text-align: center;
}
.caption {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  color: rgb(var(--cl-ink) / 0.62);
}
.dots-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--cl-ink) / 0.16);
  transition: background 0.15s;
}
.dot[data-active='true'] { background: rgb(var(--accent)); }
.counter {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgb(var(--cl-ink) / 0.42);
  margin-left: 6px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
