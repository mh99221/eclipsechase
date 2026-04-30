<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import type { DockCamCtx } from './types'

const props = defineProps<{ ctx: DockCamCtx }>()
const emit = defineEmits<{ 'cam-step': [dir: 1 | -1] }>()

const total = computed(() => props.ctx.images.length)
const safeIdx = computed(() => {
  const t = total.value
  if (t === 0) return 0
  const i = props.ctx.idx % t
  return i < 0 ? i + t : i
})
const current = computed(() => props.ctx.images[safeIdx.value] ?? null)
</script>

<template>
  <div>
    <DockHeader eyebrow="Live cam" dot-var="good" />

    <div class="title title--with-sub">{{ ctx.name }}</div>
    <div class="dir" v-if="ctx.dir">{{ ctx.dir }}</div>

    <div class="frame">
      <img
        v-if="current"
        :key="current.url"
        :src="current.url"
        :alt="current.description || ctx.name"
        class="frame-img"
        loading="lazy"
      >
      <div v-else class="frame-empty">No image available</div>
      <div class="hud-top">
        <span>{{ ctx.name }}</span>
        <span v-if="current?.description" class="hud-desc">{{ current.description }}</span>
      </div>
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
  color: rgb(255 255 255 / 0.7);
}
.hud-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  background: rgb(0 0 0 / 0.55);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: #fff;
  text-transform: uppercase;
}
.hud-desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}
.ctrls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.step {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgb(var(--border-subtle) / 0.16);
  background: rgb(var(--surface) / 0.5);
  color: rgb(var(--ink-1));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s;
}
.step:hover:not(:disabled) { background: rgb(var(--border-subtle) / 0.3); }
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
