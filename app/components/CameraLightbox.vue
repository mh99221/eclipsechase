<script setup lang="ts">
interface LightboxImage { url: string; description: string }
interface LightboxCamera { id: string; name: string; images: LightboxImage[] }

const props = defineProps<{ camera: LightboxCamera | null; startIndex?: number }>()
const emit = defineEmits<{ (e: 'close'): void }>()

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
      class="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-5 cursor-default"
      style="background: radial-gradient(ellipse at 50% 0%, #0a1628 0%, #050810 70%);"
      role="dialog"
      aria-modal="true"
      :aria-label="`${camera.name} lightbox`"
      @click="handleBackdropClick"
    >
      <!-- Top bar -->
      <div class="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5">
        <div class="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none" />
            <circle cx="8" cy="8" r="2" fill="#7dd3fc" />
          </svg>
          <span class="font-display font-semibold text-base text-ink-1">{{ camera.name }}</span>
          <span class="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3">Road camera</span>
        </div>
        <button
          class="bg-void-surface border border-void-border rounded text-ink-3 hover:text-ink-1 transition-colors font-mono text-xs px-3.5 py-1.5 cursor-pointer"
          @click="close"
        >
          Close
        </button>
      </div>

      <!-- Image -->
      <div class="relative max-w-[90vw] max-h-[70vh]">
        <img
          :src="current.url"
          :alt="current.description"
          class="max-w-[90vw] max-h-[70vh] rounded border border-void-border object-contain block"
        />
        <template v-if="hasMultiple">
          <button
            class="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded border border-void-border text-ice text-xl cursor-pointer"
            style="background: rgba(5, 8, 16, 0.8); backdrop-filter: blur(4px);"
            aria-label="Previous image"
            @click.stop="prev"
          >
            &#8249;
          </button>
          <button
            class="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded border border-void-border text-ice text-xl cursor-pointer"
            style="background: rgba(5, 8, 16, 0.8); backdrop-filter: blur(4px);"
            aria-label="Next image"
            @click.stop="next"
          >
            &#8250;
          </button>
        </template>
      </div>

      <!-- Bottom info -->
      <div class="mt-4 text-center">
        <div class="font-mono text-[13px] text-ink-2">{{ current.description || '' }}</div>
        <div v-if="hasMultiple" class="flex items-center justify-center gap-2 mt-3">
          <span
            v-for="(_, i) in images"
            :key="i"
            class="w-2 h-2 rounded-full transition-colors"
            :style="{ background: i === currentIndex ? '#7dd3fc' : '#1a2540' }"
          />
          <span class="font-mono text-[11px] text-ink-3 ml-1.5" aria-live="polite">
            {{ currentIndex + 1 }}/{{ images.length }}
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
