<script setup lang="ts">
import { REGIONS, type Region } from '~/types/spots'
import { regionLabel } from '~/utils/eclipse'
import Pill from '~/components/ui/Pill.vue'

// null = "All"
const model = defineModel<Region | null>({ required: true })

const chips = computed<Array<{ id: Region | null; label: string }>>(() => ([
  { id: null, label: 'All' },
  ...REGIONS.map(r => ({ id: r, label: regionLabel(r) })),
]))
</script>

<template>
  <div class="region-chips">
    <Pill
      v-for="c in chips"
      :key="c.id ?? 'all'"
      :active="model === c.id"
      size="md"
      @click="model = c.id"
    >{{ c.label }}</Pill>
  </div>
</template>

<style scoped>
.region-chips {
  display: flex;
  gap: 8px;
  padding: 14px 16px;
  overflow-x: auto;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  scrollbar-width: none;
}
@media (min-width: 640px) {
  .region-chips {
    margin: 0 24px;
    padding: 14px 0;
  }
}
.region-chips::-webkit-scrollbar { display: none; }
</style>
