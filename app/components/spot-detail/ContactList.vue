<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  /** ISO timestamp (UTC) when totality starts at the spot — i.e. C2. */
  totalityStart: string | null
  /** Duration of totality in seconds. */
  totalitySeconds: number
  /** Pre-computed partial begins (C1) from the eclipse grid. Optional —
   *  when missing we fall back to the calibrated approximation. */
  c1?: string | null
  /** Pre-computed partial ends (C4) from the eclipse grid. */
  c4?: string | null
}>()

/**
 * C1 / C4 sourcing:
 *
 *   1. Server enriches each spot row with `c1`/`c4` looked up from the
 *      pre-computed eclipse grid (server/utils/eclipseGrid.ts), which
 *      contains Skyfield-bisected contact times to ~1 s precision per
 *      grid point. This is the accurate path.
 *   2. If the grid hasn't been regenerated yet (or the lookup failed),
 *      we approximate using fixed offsets calibrated against the
 *      verified HELLNAR fixture for the 2026-08-12 Iceland eclipse:
 *        C1 → C2 = 59m 39s, C3 → C4 = 56m 53s.
 *      Across the full Iceland path the partial-phase duration varies
 *      < 3 min, so the approximation is within UI tolerance.
 *
 * To regenerate the grid with C1/C4:
 *   python scripts/compute-eclipse-grid.py
 *   # writes public/eclipse-data/grid.json
 */
const C1_OFFSET_SECONDS = -(59 * 60 + 39)  // -3579
const C4_OFFSET_SECONDS = (56 * 60 + 53)   // +3413

function fmtUTC(iso: string | null | undefined, offsetSec: number = 0): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    if (offsetSec) d.setUTCSeconds(d.getUTCSeconds() + offsetSec)
    return d.toISOString().slice(11, 19)
  } catch {
    return '—'
  }
}

const c1Display = computed(() => {
  if (props.c1) return fmtUTC(props.c1)
  return fmtUTC(props.totalityStart, C1_OFFSET_SECONDS)
})

const c4Display = computed(() => {
  if (props.c4) return fmtUTC(props.c4)
  return fmtUTC(props.totalityStart, props.totalitySeconds + C4_OFFSET_SECONDS)
})

const rows = computed(() => [
  { k: 'C1',  l: t('contact.partial_begins'),  t: c1Display.value,                                                                   big: false, faint: true },
  { k: 'C2',  l: t('contact.totality_begins'), t: fmtUTC(props.totalityStart),                                                       big: true,  faint: false },
  { k: 'MAX', l: t('contact.maximum'),         t: fmtUTC(props.totalityStart, Math.floor(props.totalitySeconds / 2)),                big: false, faint: false },
  { k: 'C3',  l: t('contact.totality_ends'),   t: fmtUTC(props.totalityStart, props.totalitySeconds),                                big: true,  faint: false },
  { k: 'C4',  l: t('contact.partial_ends'),    t: c4Display.value,                                                                   big: false, faint: true },
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
  color: rgb(var(--ink-1) / 0.62);
}
</style>
