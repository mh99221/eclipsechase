import type { Ref } from 'vue'

export type AdvisoryLevel = 'bad' | 'warn' | 'info'
export interface Advisory {
  level: AdvisoryLevel
  title: string
  body: string
}
export type RawAdvisory = string | { level?: string; title?: string; body?: string }

function isLevel(v: unknown): v is AdvisoryLevel {
  return v === 'bad' || v === 'warn' || v === 'info'
}

/**
 * Normalises a `viewing_spots.warnings` JSONB column into a flat list of
 * `{level, title, body}` advisories. Tolerates the legacy `string[]` shape
 * (treats each string as an `info`-level title) AND the migrated
 * `{level, title, body}[]` shape (per scripts/migrations/004-advisories-shape.sql).
 *
 * Used by both AdvisoriesBlock (renders inline + expanded cards) and
 * AdvisoriesBadge (header pill on the spot detail page) so they always
 * agree on the count and the highest severity present.
 */
export function useAdvisories(warnings: Ref<RawAdvisory[]>) {
  const normalized = computed<Advisory[]>(() => {
    const out: Advisory[] = []
    for (const w of warnings.value ?? []) {
      if (typeof w === 'string') {
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

  /** Critical (bad-level) advisories — always rendered inline so users can't miss them. */
  const critical = computed<Advisory[]>(() => normalized.value.filter(a => a.level === 'bad'))

  const count = computed(() => normalized.value.length)

  /** Highest severity present, used to colour the badge glyph + border. */
  const topLevel = computed<AdvisoryLevel>(() => {
    let hasWarn = false
    for (const a of normalized.value) {
      if (a.level === 'bad') return 'bad'
      if (a.level === 'warn') hasWarn = true
    }
    return hasWarn ? 'warn' : 'info'
  })

  return { normalized, critical, count, topLevel }
}
