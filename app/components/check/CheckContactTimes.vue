<script setup lang="ts">
/**
 * Eclipse contact times for the checked location. Mirrors the
 * spot-detail/ContactList row layout (40px contact key + label + UTC
 * time, divider between rows) so /check feels consistent with the
 * curated-spot pages.
 *
 * Inside the path: full C1 → C2 → MAX → C3 → C4 timetable.
 * Outside the path: just C1 + C4 (the partial-eclipse bracket).
 */
import type { CheckResult } from '~/types/check'

const { t } = useI18n()
const props = defineProps<{ result: CheckResult }>()

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toISOString().slice(11, 19)
}

function midpoint(c2: string | null, c3: string | null): string {
  if (!c2 || !c3) return '—'
  const a = new Date(c2).getTime()
  const b = new Date(c3).getTime()
  if (isNaN(a) || isNaN(b)) return '—'
  return new Date((a + b) / 2).toISOString().slice(11, 19)
}

const rows = computed(() => {
  const ct = props.result.totality.contactTimes
  const inside = props.result.totality.insidePath
  if (inside) {
    return [
      { k: 'C1',  l: t('check.contact_partial_begins'),  v: fmtTime(ct.c1), big: false, faint: true  },
      { k: 'C2',  l: t('check.contact_totality_begins'), v: fmtTime(ct.c2), big: true,  faint: false },
      { k: 'MAX', l: t('check.contact_maximum'),         v: midpoint(ct.c2, ct.c3), big: false, faint: false },
      { k: 'C3',  l: t('check.contact_totality_ends'),   v: fmtTime(ct.c3), big: true,  faint: false },
      { k: 'C4',  l: t('check.contact_partial_ends'),    v: fmtTime(ct.c4), big: false, faint: true  },
    ]
  }
  return [
    { k: 'C1', l: t('check.contact_partial_begins'), v: fmtTime(ct.c1), big: false, faint: false },
    { k: 'C4', l: t('check.contact_partial_ends'),   v: fmtTime(ct.c4), big: false, faint: false },
  ]
})
</script>

<template>
  <div class="contact-list">
    <div
      v-for="r in rows"
      :key="r.k"
      class="row"
      :data-big="r.big"
      :data-faint="r.faint"
    >
      <span class="k">{{ r.k }}</span>
      <span class="l">{{ r.l }}</span>
      <span class="t">{{ r.v }}</span>
    </div>
  </div>
</template>

<style scoped>
.contact-list { display: flex; flex-direction: column; }
.row {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 12px;
  padding: 10px 0;
  align-items: center;
}
.row + .row { border-top: 1px solid rgb(var(--border-subtle) / 0.08); }
.k {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgb(var(--ink-1) / 0.62);
  letter-spacing: 0.06em;
  font-weight: 600;
}
.l {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1));
}
.t {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: rgb(var(--ink-1));
}
.row[data-big='true'] .l,
.row[data-big='true'] .t {
  font-size: 15px;
  font-weight: 500;
  color: rgb(var(--totality));
}
.row[data-big='true'] .k {
  color: rgb(var(--accent));
}
.row[data-faint='true'] .l,
.row[data-faint='true'] .t {
  color: rgb(var(--ink-1) / 0.62);
}
</style>
