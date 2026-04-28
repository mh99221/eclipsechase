<script setup lang="ts">
const { t, tm } = useI18n()

const items = computed<string[]>(() => {
  const raw = tm('v0.home.checklist') as unknown
  return Array.isArray(raw) ? raw.map(String) : []
})

// Use the existing localStorage key so saved state survives the redesign.
const STORAGE_KEY = 'eclipse-checklist'
const checked = ref<Record<number, boolean>>({})

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) checked.value = JSON.parse(saved) ?? {}
  } catch { /* ignore parse errors — start fresh */ }
})

function toggle(i: number) {
  checked.value = { ...checked.value, [i]: !checked.value[i] }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked.value))
  } catch { /* ignore quota errors */ }
}

const checkedCount = computed(() => Object.values(checked.value).filter(Boolean).length)
</script>

<template>
  <section class="checklist">
    <div class="checklist-head">
      <Eyebrow>{{ t('v0.home.checklist_eyebrow') }}</Eyebrow>
      <span class="counter">{{ checkedCount }}/{{ items.length }}</span>
    </div>
    <div class="checklist-card">
      <button
        v-for="(item, i) in items"
        :key="i"
        type="button"
        class="row"
        :data-checked="!!checked[i]"
        :aria-pressed="!!checked[i]"
        @click="toggle(i)"
      >
        <span class="circle" aria-hidden="true">
          <svg v-if="checked[i]" viewBox="0 0 10 10" width="10" height="10">
            <path d="M1 5l3 3 5-6" stroke="rgb(var(--bg))" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="text">{{ item }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.checklist { padding: 8px 16px 24px; }
.checklist-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.counter {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--ink-1));
}
.checklist-card {
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 10px;
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 18px;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  min-height: 44px;
  color: inherit;
}
.row + .row { border-top: 1px solid rgb(var(--border-subtle) / 0.08); }
.circle {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid rgb(var(--border-subtle) / 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.row[data-checked='true'] .circle {
  background: rgb(var(--accent));
  border-color: rgb(var(--accent));
}
.text {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  color: rgb(var(--ink-1));
}
.row[data-checked='true'] .text {
  color: rgb(var(--ink-1) / 0.62);
  text-decoration: line-through;
}

/* Desktop overrides — placed after base rules so cascade wins. */
@media (min-width: 768px) {
  .checklist { padding: 8px 24px 40px; }
  .row { padding: 16px 24px; }
  .text { font-size: 15px; }
}
</style>
