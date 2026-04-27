<script setup lang="ts">
const props = defineProps<{
  /** ISO timestamp (UTC) when totality starts at the spot. */
  totalityStart: string | null
  /** Duration of totality in seconds. */
  totalitySeconds: number
}>()

/**
 * Production data only stores totality_start + duration. We render C2 directly,
 * derive MAX (start + duration/2) and C3 (start + duration), and leave C1/C4
 * as placeholders until the eclipse-grid lookup is wired in.
 *
 * TODO(v0-spec): pull C1/C4 from server/utils/eclipseGrid.ts at request time.
 */
function fmtUTC(iso: string | null, offsetSec: number = 0): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    d.setUTCSeconds(d.getUTCSeconds() + offsetSec)
    return d.toISOString().slice(11, 19)
  } catch {
    return '—'
  }
}

const rows = computed(() => [
  { k: 'C1',  l: 'Partial begins',    t: '—',                                                                  big: false, faint: true },
  { k: 'C2',  l: 'Totality begins',   t: fmtUTC(props.totalityStart),                                           big: true,  faint: false },
  { k: 'MAX', l: 'Maximum',           t: fmtUTC(props.totalityStart, Math.floor(props.totalitySeconds / 2)),    big: false, faint: false },
  { k: 'C3',  l: 'Totality ends',     t: fmtUTC(props.totalityStart, props.totalitySeconds),                    big: true,  faint: false },
  { k: 'C4',  l: 'Partial ends',      t: '—',                                                                  big: false, faint: true },
])
</script>

<template>
  <div class="contact-list">
    <div
      v-for="(r, i) in rows"
      :key="r.k"
      class="row"
      :data-big="r.big"
      :data-faint="r.faint"
    >
      <span class="k">{{ r.k }}</span>
      <span class="l">{{ r.l }}</span>
      <span class="t">{{ r.t }}</span>
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
  color: rgb(var(--ink-1) / 0.42);
}
</style>
