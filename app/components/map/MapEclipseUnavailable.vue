<script setup lang="ts">
/**
 * Shown on /map when the user selects the ECLIPSE DAY forecast mode but
 * vedur's model horizon hasn't reached Aug 12 yet (the cloud-cover
 * endpoint reports `available: false`).
 *
 * We deliberately show nothing rather than falling back to near-term
 * data: the whole point of the mode switch is that the two readings are
 * different, so silently substituting one for the other would recreate
 * the very confusion the toggle exists to remove.
 */
const { t } = useI18n()

defineEmits<{ 'show-now': [] }>()
</script>

<template>
  <div class="unavailable-wrap" role="status">
    <div class="unavailable-card">
      <svg
        class="icon"
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <p class="title">{{ t('map.eclipse_mode_unavailable_title') }}</p>
      <p class="body">{{ t('map.eclipse_mode_unavailable') }}</p>
      <button type="button" class="cta" @click="$emit('show-now')">
        {{ t('map.eclipse_mode_show_now') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Centred over the map canvas. `pointer-events: none` on the wrapper so
   the user can still pan/zoom the map around the card; the card itself
   re-enables them for its button. */
.unavailable-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 6;
  pointer-events: none;
}
.unavailable-card {
  pointer-events: auto;
  max-width: 340px;
  text-align: center;
  padding: 20px 22px;
  border-radius: 12px;
  background: rgb(var(--map-pane-strong, 15 23 42) / 0.92);
  border: 1px solid rgb(var(--border-subtle, 255 255 255) / 0.16);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.32);
}
.icon {
  color: rgb(var(--accent));
  opacity: 0.75;
  margin-bottom: 10px;
}
.title {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.78);
  margin: 0 0 8px;
}
.body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.62);
  margin: 0 0 14px;
}
.cta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--accent));
  background: rgb(var(--accent) / 0.1);
  border: 1px solid rgb(var(--accent) / 0.32);
  border-radius: 99px;
  padding: 7px 14px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.cta:hover {
  background: rgb(var(--accent) / 0.18);
  border-color: rgb(var(--accent) / 0.5);
}
.cta:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
</style>
