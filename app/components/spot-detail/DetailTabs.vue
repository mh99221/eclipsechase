<script setup lang="ts">
import Pill from '~/components/ui/Pill.vue'

type TabKey = 'overview' | 'sky' | 'weather' | 'plan'
const model = defineModel<TabKey>({ required: true })

const { t } = useI18n()
const tabs = computed<Array<{ k: TabKey; l: string }>>(() => ([
  { k: 'overview', l: t('v0.spot_detail.tab_overview') },
  { k: 'sky',      l: t('v0.spot_detail.tab_sky') },
  { k: 'weather',  l: t('v0.spot_detail.tab_weather') },
  { k: 'plan',     l: t('v0.spot_detail.tab_plan') },
]))
</script>

<template>
  <div class="detail-tabs" role="tablist">
    <Pill
      v-for="tab in tabs"
      :key="tab.k"
      :active="model === tab.k"
      size="md"
      :aria-selected="model === tab.k"
      role="tab"
      @click="model = tab.k"
    >{{ tab.l }}</Pill>
  </div>
</template>

<style scoped>
.detail-tabs {
  display: flex;
  gap: 6px;
  padding: 4px 16px 14px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  overflow-x: auto;
  scrollbar-width: none;
}
@media (min-width: 640px) {
  /* Inset the row + its bottom border by 24px so the rule lines up with
     the card grid below instead of spanning the full column. */
  .detail-tabs {
    margin: 0 24px;
    padding: 8px 0 18px;
    gap: 8px;
  }
}
.detail-tabs::-webkit-scrollbar { display: none; }
</style>
