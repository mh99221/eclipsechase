<script setup lang="ts">
defineEmits<{ close: [] }>()
const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    :aria-label="t('map.close')"
    class="dock-close"
    @click="$emit('close')"
  >
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  </button>
</template>

<style scoped>
.dock-close {
  position: absolute;
  top: 10px;
  right: 10px;
  /* z above the body content but inside the card's overflow:hidden clip. */
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  /* `--ink-1` is the inverse-of-surface token (cream on dark dock,
     navy on cream dock), so a low-alpha tint of it reads as a faint
     nudge against the surface in both themes. */
  background: rgb(var(--ink-1) / 0.04);
  border: 1px solid rgb(var(--ink-1) / 0.08);
  /* The 0.62 alpha matches the rest of the dock's "dim" text. */
  color: rgb(var(--ink-1) / 0.62);
  cursor: pointer;
  transition: background-color 120ms linear, color 120ms linear, border-color 120ms linear;
}
.dock-close:hover {
  background: rgb(var(--ink-1) / 0.08);
  border-color: rgb(var(--ink-1) / 0.16);
  color: rgb(var(--ink-1));
}
.dock-close:focus-visible {
  outline: 2px solid rgb(var(--accent) / 0.6);
  outline-offset: 2px;
}
</style>
