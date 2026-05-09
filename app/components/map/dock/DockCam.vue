<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import type { DockCamCtx } from './types'

const props = defineProps<{ ctx: DockCamCtx }>()
const emit = defineEmits<{ 'cam-step': [dir: 1 | -1] }>()

const { t } = useI18n()

const total = computed(() => props.ctx.images.length)
const safeIdx = computed(() => {
  const t = total.value
  if (t === 0) return 0
  const i = props.ctx.idx % t
  return i < 0 ? i + t : i
})
const current = computed(() => props.ctx.images[safeIdx.value] ?? null)
// Subtitle reflects the angle currently shown — falls back to the
// camera's primary `dir` blurb when the carousel has no image.
const subtitle = computed(() => current.value?.description || props.ctx.dir || '')
</script>

<template>
  <div>
    <DockHeader :eyebrow="t('map_extra.cam_label')" dot-var="good" />

    <div class="title title--with-sub">{{ ctx.name }}</div>
    <div class="dir" v-if="subtitle">{{ subtitle }}</div>

    <div class="frame">
      <img
        v-if="current"
        :key="current.url"
        :src="current.url"
        :alt="current.description || ctx.name"
        class="frame-img"
        loading="lazy"
      >
      <div v-else class="frame-empty">{{ t('map_extra.cam_no_image') }}</div>
    </div>

    <div class="ctrls">
      <button
        type="button"
        class="step"
        :disabled="total <= 1"
        aria-label="Previous camera image"
        @click="emit('cam-step', -1)"
      >‹</button>
      <div class="dots">
        <span
          v-for="i in total"
          :key="i"
          class="dot"
          :data-active="i - 1 === safeIdx"
        />
      </div>
      <button
        type="button"
        class="step"
        :disabled="total <= 1"
        aria-label="Next camera image"
        @click="emit('cam-step', 1)"
      >›</button>
    </div>
  </div>
</template>

<style scoped>
/* `.title` comes from MapDock's shared style. */
.dir {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-1) / 0.62);
  margin-bottom: 10px;
}
.frame {
  position: relative;
  height: 140px;
  margin-bottom: 10px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgb(var(--border-subtle) / 0.16);
  background: linear-gradient(180deg, #6a7585 0%, #4a5260 60%, #2c3038 100%);
}
.frame-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.frame-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  /* `--ink-1` is the inverse-of-surface ink (cream over the dark cam
     gradient, navy in light theme) — readable on either backdrop. */
  color: rgb(var(--ink-1) / 0.7);
}
.ctrls {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* Carousel arrows match the dock's ghost-button style: transparent fill
   + subtle border, hover lifts to a faint ink-1 tint. Same visual family
   as `.btn-ghost` in MapDock so the dock feels uniform. */
.step {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgb(var(--border-subtle) / 0.16);
  background: transparent;
  color: rgb(var(--ink-1));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s;
}
.step:hover:not(:disabled) { background: rgb(var(--ink-1) / 0.06); }
.step:disabled { opacity: 0.4; cursor: default; }
.dots {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 5px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--border-subtle) / 0.4);
}
.dot[data-active='true'] { background: rgb(var(--accent)); }
</style>
