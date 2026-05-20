<script setup lang="ts">
// Shared Free-vs-Pro feature breakdown. Used by /pro (as the canonical
// pricing breakdown) and by / (landing) inside the "FREE VS PRO" teaser
// section. Single source of truth for both row content and visual rhythm
// — when we change a feature row, both surfaces stay in sync.
//
// Three-bucket order:
//  1. "Plan in advance" — features both tiers share (reassurance first,
//     reduces buyer anxiety).
//  2. "Decide on the day" — every row is Pro-only and answers a real
//     day-of question (conversion driver).
//  3. "On the road" — PWA polish (offline).
//
// Row labels live in v0.pro_compare.* — Icelandic falls back to English
// for the v0.* namespace via Nuxt i18n.
const { t } = useI18n()

const props = withDefaults(defineProps<{
  /** Show "WHAT'S IN PRO" header above the table. /pro wants it,
   *  landing-page teaser doesn't (it has its own section eyebrow). */
  showHeader?: boolean
  /** Show the closing "A one-time €9.99 unlocks everything." tagline.
   *  /pro wants it (followed by the price card); landing skips it
   *  because the surrounding price card already states the price. */
  showTagline?: boolean
}>(), {
  showHeader: false,
  showTagline: false,
})

type CompareRow = { key: string; free: boolean; pro: boolean }
const compareSections: Array<{ titleKey: string; rows: CompareRow[] }> = [
  {
    titleKey: 'section_plan',
    rows: [
      { key: 'row_plan_browse', free: true, pro: true },
      { key: 'row_plan_times', free: true, pro: true },
      { key: 'row_plan_history', free: true, pro: true },
      { key: 'row_plan_guide', free: true, pro: true },
    ],
  },
  {
    titleKey: 'section_decide',
    rows: [
      { key: 'row_decide_map', free: false, pro: true },
      { key: 'row_decide_personalised', free: false, pro: true },
      { key: 'row_decide_horizon', free: false, pro: true },
      { key: 'row_decide_roads', free: false, pro: true },
      { key: 'row_decide_dashboard', free: false, pro: true },
    ],
  },
  {
    titleKey: 'section_road',
    rows: [
      { key: 'row_road_offline', free: false, pro: true },
    ],
  },
]
</script>

<template>
  <div class="compare-wrap">
    <CardTitle v-if="props.showHeader">{{ t('v0.pro_compare.header') }}</CardTitle>
    <table class="compare-table">
      <!--
        WCAG H43 — when a table mixes column + rowgroup + row `th`s,
        `scope` alone isn't sufficient: each <td> must point at the
        specific <th>s it relates to via `headers`. We give every
        <th> a stable id and reference all three (col / group / row)
        on every <td>. Verified passing under pa11y-ci's WCAG2AA.
      -->
      <thead>
        <tr>
          <!-- Corner cell isn't a header — keep it a <td> so pa11y's
               "every <th> must have an id" rule doesn't trip on a
               cell no <td> ever needs to reference. -->
          <td aria-hidden="true" />
          <th id="cmp-col-free" scope="col">{{ t('v0.pro_compare.free_col') }}</th>
          <th id="cmp-col-pro" scope="col">{{ t('v0.pro_compare.pro_col') }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="section in compareSections" :key="section.titleKey">
          <tr class="section-row">
            <th
              :id="`cmp-grp-${section.titleKey}`"
              scope="rowgroup"
              colspan="3"
            >{{ t(`v0.pro_compare.${section.titleKey}`) }}</th>
          </tr>
          <tr v-for="row in section.rows" :key="row.key">
            <th :id="`cmp-row-${row.key}`" scope="row" class="row-l">{{ t(`v0.pro_compare.${row.key}`) }}</th>
            <td
              class="row-v"
              :headers="`cmp-col-free cmp-grp-${section.titleKey} cmp-row-${row.key}`"
              :data-state="row.free ? 'yes' : 'no'"
            >
              <span :aria-label="row.free ? t('v0.pro_compare.included') : t('v0.pro_compare.not_included')">
                {{ row.free ? '✓' : '—' }}
              </span>
            </td>
            <td
              class="row-v"
              :headers="`cmp-col-pro cmp-grp-${section.titleKey} cmp-row-${row.key}`"
              :data-state="row.pro ? 'yes' : 'no'"
            >
              <span :aria-label="row.pro ? t('v0.pro_compare.included') : t('v0.pro_compare.not_included')">
                {{ row.pro ? '✓' : '—' }}
              </span>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    <p v-if="props.showTagline" class="compare-tagline">{{ t('v0.pro_compare.tagline') }}</p>
  </div>
</template>

<style scoped>
.compare-table {
  width: 100%;
  border-collapse: collapse;
}
.compare-table thead th {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: rgb(var(--ink-1) / 0.62);
  text-transform: uppercase;
  font-weight: 500;
  text-align: center;
  padding-bottom: 10px;
  width: 64px;
}
.compare-table thead th:first-child { width: auto; }

/* Section header row spans all three columns and provides the visual
   group break. The :first-child guard kills the top border so the first
   group sits flush under the column headers. */
.compare-table .section-row th {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  text-align: left;
  padding: 14px 0 4px;
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
}
.compare-table tbody tr.section-row:first-child th {
  border-top: 0;
  padding-top: 4px;
}

.compare-table .row-l {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  color: rgb(var(--ink-1) / 0.85);
  text-align: left;
  padding: 6px 12px 6px 0;
}
.compare-table .row-v {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  padding: 6px 0;
}
.compare-table .row-v[data-state='yes'] { color: rgb(var(--good)); }
.compare-table .row-v[data-state='no']  { color: rgb(var(--ink-1) / 0.32); }

.compare-tagline {
  margin-top: 18px;
  text-align: center;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: rgb(var(--ink-1) / 0.62);
}
</style>
