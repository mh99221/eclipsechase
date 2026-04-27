<script setup lang="ts">
import { PROFILES, type ProfileId } from '~/composables/useRecommendation'
import Pill from '~/components/ui/Pill.vue'
import Eyebrow from '~/components/ui/Eyebrow.vue'

const model = defineModel<ProfileId | null>({ required: true })

const { t, te } = useI18n()

interface ProfileEntry {
  id: ProfileId | null
  name: string
  hint: string
}

const entries = computed<ProfileEntry[]>(() => {
  const all: ProfileEntry = { id: null, name: 'All', hint: 'No preferences applied' }
  return [
    all,
    ...PROFILES.map(p => ({
      id: p.id,
      name: p.name,
      hint: te(p.descriptionKey) ? t(p.descriptionKey) : '',
    })),
  ]
})

const activeHint = computed(() => entries.value.find(e => e.id === model.value)?.hint ?? '')

function pick(id: ProfileId | null) {
  model.value = id
}
</script>

<template>
  <section class="profile-selector">
    <Eyebrow tone="faint" variant="dash">VIEWER PROFILE</Eyebrow>
    <div class="pills">
      <Pill
        v-for="e in entries"
        :key="e.id ?? 'all'"
        :active="model === e.id"
        size="md"
        @click="pick(e.id)"
      >{{ e.name }}</Pill>
    </div>
    <div v-if="activeHint" class="hint">{{ activeHint }}</div>
  </section>
</template>

<style scoped>
.profile-selector {
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
}
@media (min-width: 640px) {
  /* Inset the row + its border-bottom so the rule aligns with the
     card grid (page gutter is 24px on desktop). */
  .profile-selector {
    margin: 0 24px;
    padding: 14px 0 10px;
  }
}
.profile-selector :deep(.eyebrow) {
  margin-bottom: 8px;
}
.pills {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 8px;
  scrollbar-width: none;
}
.pills::-webkit-scrollbar { display: none; }
.hint {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  font-style: italic;
  color: rgb(var(--ink-1) / 0.62);
}
</style>
