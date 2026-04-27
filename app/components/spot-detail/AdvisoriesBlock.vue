<script setup lang="ts">
import AdvisoryCard from '~/components/ui/AdvisoryCard.vue'
import Eyebrow from '~/components/ui/Eyebrow.vue'

const props = defineProps<{ warnings: string[] }>()
const count = computed(() => props.warnings.length)
</script>

<template>
  <section v-if="count > 0" class="advisories-block">
    <Eyebrow variant="dash">ADVISORIES · {{ count }}</Eyebrow>
    <div class="advisories-list">
      <!--
        Existing data shape is string[]; v0 spec expects {level,title,body}[]
        with per-warning level. Visual-only redesign: render every entry as
        info-level until the schema upgrade lands.
        TODO(v0-spec): use real level + body once warnings JSONB shape is upgraded.
      -->
      <AdvisoryCard
        v-for="(w, i) in warnings"
        :key="i"
        level="info"
        :title="w"
      />
    </div>
  </section>
</template>

<style scoped>
.advisories-block { padding: 0 16px 14px; }
.advisories-block :deep(.eyebrow) { margin: 4px 0 8px; }
.advisories-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
