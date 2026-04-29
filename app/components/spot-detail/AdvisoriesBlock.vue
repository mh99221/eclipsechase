<script setup lang="ts">
import { toRef } from 'vue'
import AdvisoryCard from '~/components/ui/AdvisoryCard.vue'
import { useAdvisories, type RawAdvisory } from '~/composables/useAdvisories'

const props = defineProps<{
  warnings: RawAdvisory[]
  /**
   * Driven by parent — controls whether the full expanded list shows.
   * Critical (bad-level) entries always render inline regardless.
   */
  expanded?: boolean
}>()

const { normalized, critical, count } = useAdvisories(toRef(props, 'warnings'))
</script>

<template>
  <section v-if="count > 0" class="advisories-block">
    <!-- Critical (bad-level) — always inline so they can't be missed
         even when the rest of the list is collapsed behind the badge. -->
    <AdvisoryCard
      v-for="(a, i) in critical"
      :key="`crit-${i}`"
      :level="a.level"
      :title="a.title"
      :body="a.body || undefined"
    />

    <!-- Full list — revealed when the AdvisoriesBadge is toggled in the
         hero. Repeats the critical entries above, accepting that small
         redundancy in exchange for "expanded view = the entire list,
         no carve-outs to remember". -->
    <Transition name="advisories-expand">
      <div v-if="expanded" id="advisories-list" class="advisories-expanded">
        <AdvisoryCard
          v-for="(a, i) in normalized"
          :key="`all-${i}`"
          :level="a.level"
          :title="a.title"
          :body="a.body || undefined"
        />
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.advisories-block {
  padding: 0 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.advisories-expanded {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

/* Animated max-height + opacity expand. The 1500px ceiling is far above
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

@media (min-width: 768px) {
  .advisories-block { padding: 0 24px 18px; gap: 8px; }
  .advisories-expanded { gap: 8px; }
}
</style>
