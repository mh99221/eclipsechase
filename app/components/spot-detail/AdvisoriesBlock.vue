<script setup lang="ts">
import AdvisoryCard from '~/components/ui/AdvisoryCard.vue'
import Eyebrow from '~/components/ui/Eyebrow.vue'

type Level = 'bad' | 'warn' | 'info'
type RawWarning = string | { level?: string; title?: string; body?: string }

const props = defineProps<{
  /**
   * Mixed-shape input. Old rows are plain strings; rows migrated by
   * scripts/migrations/004-advisories-shape.sql are
   * {level, title, body} objects. Component normalises both.
   */
  warnings: RawWarning[]
}>()

function isLevel(v: unknown): v is Level {
  return v === 'bad' || v === 'warn' || v === 'info'
}

interface Advisory {
  level: Level
  title: string
  body: string
}

const normalized = computed<Advisory[]>(() => {
  const out: Advisory[] = []
  for (const w of props.warnings ?? []) {
    if (typeof w === 'string') {
      // Legacy shape: render as info-level with the string as title.
      if (w.trim()) out.push({ level: 'info', title: w, body: '' })
      continue
    }
    if (w && typeof w === 'object' && typeof w.title === 'string' && w.title.trim()) {
      out.push({
        level: isLevel(w.level) ? w.level : 'info',
        title: w.title,
        body: typeof w.body === 'string' ? w.body : '',
      })
    }
  }
  return out
})

const count = computed(() => normalized.value.length)
</script>

<template>
  <section v-if="count > 0" class="advisories-block">
    <Eyebrow variant="dash">ADVISORIES · {{ count }}</Eyebrow>
    <div class="advisories-list">
      <AdvisoryCard
        v-for="(a, i) in normalized"
        :key="i"
        :level="a.level"
        :title="a.title"
        :body="a.body || undefined"
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

/* Desktop overrides — after base rules. */
@media (min-width: 768px) {
  .advisories-block { padding: 0 24px 18px; }
  .advisories-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
}
</style>
