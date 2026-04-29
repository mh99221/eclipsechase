<script setup lang="ts">
import { toRef } from 'vue'
import AdvisoryCard from '~/components/ui/AdvisoryCard.vue'
import { useAdvisories, type RawAdvisory } from '~/composables/useAdvisories'

const props = defineProps<{
  warnings: RawAdvisory[]
  /**
   * Driven by parent — controls whether the list shows. When false, the
   * section is unmounted entirely (no inline cards, no padding gap). The
   * AdvisoriesBadge in the hero is the sole visible signal in that state,
   * and its severity-tinted border + glyph carry the escalation cue.
   */
  expanded?: boolean
}>()

const { normalized, count } = useAdvisories(toRef(props, 'warnings'))
</script>

<template>
  <Transition name="advisories-expand">
    <section
      v-if="expanded && count > 0"
      id="advisories-list"
      class="advisories-block"
    >
      <AdvisoryCard
        v-for="(a, i) in normalized"
        :key="i"
        :level="a.level"
        :title="a.title"
        :body="a.body || undefined"
      />
    </section>
  </Transition>
</template>

<style scoped>
.advisories-block {
  padding: 0 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}
@media (min-width: 768px) {
  .advisories-block { padding: 0 24px 18px; gap: 8px; }
}

/* Animated max-height + opacity expand. The 1500 px ceiling is far above
   any realistic advisory count (typically 0–6 cards) so growth feels
   uncapped without dynamic measurement. */
.advisories-expand-enter-active,
.advisories-expand-leave-active {
  transition: max-height 0.22s ease-out, opacity 0.18s ease-out;
}
.advisories-expand-enter-from,
.advisories-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.advisories-expand-enter-to,
.advisories-expand-leave-from {
  max-height: 1500px;
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .advisories-expand-enter-active,
  .advisories-expand-leave-active { transition: none; }
}
</style>
