<script setup lang="ts">
defineEmits<{ close: [] }>()
</script>

<template>
  <button
    type="button"
    aria-label="Close"
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
  background: rgb(255 255 255 / 0.04);
  border: 1px solid rgb(255 255 255 / 0.08);
  /* `--ink-1` is the ink token; the 0.62 alpha matches the rest of the
     dock's "dim" text (eyebrow meta, stat labels). */
  color: rgb(var(--ink-1) / 0.62);
  cursor: pointer;
  transition: background-color 120ms linear, color 120ms linear, border-color 120ms linear;
}
.dock-close:hover {
  background: rgb(255 255 255 / 0.08);
  border-color: rgb(255 255 255 / 0.16);
  color: rgb(var(--ink-1));
}
.dock-close:focus-visible {
  outline: 2px solid rgb(var(--accent) / 0.6);
  outline-offset: 2px;
}
</style>
