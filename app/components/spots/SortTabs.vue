<script setup lang="ts">
type SortKey = 'duration' | 'historical'

defineProps<{ disabled?: boolean }>()
const model = defineModel<SortKey>({ required: true })

const { t } = useI18n()

const tabs = computed<Array<{ k: SortKey; l: string }>>(() => ([
  { k: 'duration',   l: t('v0.spots.sort_duration') },
  { k: 'historical', l: t('v0.spots.sort_clearness') },
]))
</script>

<template>
  <div class="sort-tabs" :data-disabled="disabled" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.k"
      type="button"
      class="tab"
      :data-active="model === tab.k"
      :aria-selected="model === tab.k"
      :disabled="disabled"
      role="tab"
      @click="model = tab.k"
    >{{ tab.l }}</button>
  </div>
</template>

<style scoped>
.sort-tabs {
  display: flex;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
}
@media (min-width: 640px) {
  /* Inset the tab row to align with the page's 24px content gutter, so
     the bottom border lines up with the card grid below. */
  .sort-tabs { margin: 0 24px; }
}
.sort-tabs[data-disabled='true'] {
  opacity: 0.5;
  pointer-events: none;
}
.tab {
  flex: 1;
  padding: 14px 8px;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: rgb(var(--ink-1) / 0.62);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  min-height: 44px;
}
.tab[data-active='true'] {
  background: rgb(var(--surface) / 0.04);
  color: rgb(var(--accent));
  border-bottom-color: rgb(var(--accent));
}
.tab:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: -2px;
}
</style>
