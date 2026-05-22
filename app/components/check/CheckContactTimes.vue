<script setup lang="ts">
/**
 * Eclipse contact times for the checked location. Reuses the ContactList
 * formatting idea from spot-detail but standalone, since /check isn't
 * tied to a curated spot. Handles two cases:
 *   - inside path: C1 → C2 → C3 → C4 with totality bracketed
 *   - outside path: C1 → C4 only (partial eclipse)
 */
import type { CheckResult } from '~/types/check'

const props = defineProps<{ result: CheckResult }>()

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const rows = computed(() => {
  const ct = props.result.totality.contactTimes
  const inside = props.result.totality.insidePath
  const list: { label: string; time: string; accent?: boolean }[] = [
    { label: 'Partial begins (C1)', time: fmtTime(ct.c1) },
  ]
  if (inside) {
    list.push({ label: 'Totality begins (C2)', time: fmtTime(ct.c2), accent: true })
    list.push({ label: 'Totality ends (C3)', time: fmtTime(ct.c3), accent: true })
  }
  list.push({ label: 'Partial ends (C4)', time: fmtTime(ct.c4) })
  return list
})
</script>

<template>
  <section>
    <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-3">
      Contact times (UTC)
    </p>
    <div class="bg-surface border border-border-subtle/40 rounded divide-y divide-border-subtle/40">
      <div
        v-for="row in rows"
        :key="row.label"
        class="flex items-center justify-between px-4 py-3"
      >
        <span class="text-sm text-ink-2" :class="{ 'text-ink-1 font-semibold': row.accent }">
          {{ row.label }}
        </span>
        <span class="font-mono text-sm tabular-nums" :class="row.accent ? 'text-accent' : 'text-ink-2'">
          {{ row.time }}
        </span>
      </div>
    </div>
  </section>
</template>
