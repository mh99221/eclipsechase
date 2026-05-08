<script setup lang="ts">
defineProps<{
  active?: boolean
  size?: 'sm' | 'md'        // sm = 6×10/mono10, md = 6×12/mono11
  surface?: 'default' | 'glass'  // glass = map-overlay backdrop blur
}>()
</script>

<template>
  <button
    type="button"
    class="pill"
    :data-active="active ?? false"
    :data-size="size ?? 'md'"
    :data-surface="surface ?? 'default'"
    :aria-pressed="active ?? false"
  >
    <slot />
  </button>
</template>

<style scoped>
.pill {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 500;
  border-radius: 99px;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  color: rgb(var(--ink-1) / 0.62);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
/* Light theme: small mono caps at 0.62 alpha on cream falls below
   WCAG AA (~3.6:1). Bump alpha + border so unselected pills stay
   legible against the cream paper background. */
html.light .pill {
  color: rgb(var(--ink-1) / 0.85);
  border-color: rgb(var(--border-subtle) / 0.28);
  background: rgb(var(--ink-1) / 0.04);
}
html.light .pill[data-active='true'] {
  color: rgb(var(--accent-ink));
  background: rgb(var(--accent));
  border-color: rgb(var(--accent));
}
.pill[data-size='sm'] { padding: 6px 10px; font-size: 10px; letter-spacing: 0.1em; }
.pill[data-size='md'] { padding: 6px 12px; font-size: 11px; letter-spacing: 0.045em; }

.pill[data-surface='glass'] {
  /* Theme-aware via `--map-pane-chip` — dark scrim over the dark map
     style, cream pane over the light style. Dark in dark, cream in light. */
  background: rgb(var(--map-pane-chip) / 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.pill[data-active='true'] {
  background: rgb(var(--accent) / 0.16);
  color: rgb(var(--accent));
  border-color: rgb(var(--accent));
}
.pill[data-surface='glass'][data-active='true'] {
  background: rgb(var(--accent) / 0.18);
}

.pill:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
</style>
