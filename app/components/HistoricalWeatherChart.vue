<script setup lang="ts">
/**
 * 10-year cloud cover chart for a single spot, sampled at 17:45 UTC
 * on Aug 12 — the moment of totality. Data is populated offline by
 * scripts/fetch-historical-weather.mjs from Open-Meteo's ERA5 archive.
 *
 * Bars are dual-encoded: height = clearness (100 − cloud_cover, so
 * taller = clearer) and colour = verdict band. Hovering a bar reveals
 * the exact percentage for that year.
 */
import { cloudToStatus, type V0Status } from '~/utils/v0'

export interface HistoricalYearPoint {
  year: number
  cloud_cover: number | null
}
export interface HistoricalWeather {
  years: HistoricalYearPoint[]
  clear_years: number
  partly_years: number
  overcast_years: number
  total_years: number
  avg_cloud_cover: number | null
}

const props = defineProps<{ history: HistoricalWeather }>()
const { t } = useI18n()

type Band = 'clear' | 'partly' | 'overcast' | 'unknown'
const STATUS_TO_BAND: Record<V0Status, Band> = {
  good: 'clear',
  marginal: 'partly',
  bad: 'overcast',
}
function bandFor(cc: number | null): Band {
  if (cc == null) return 'unknown'
  return STATUS_TO_BAND[cloudToStatus(cc)]
}

/** Percentage used for bar height — flip the scale so taller = clearer. */
function clearnessHeight(cc: number | null): number {
  if (cc == null) return 12 // minimum sliver so "no data" is visible
  return Math.max(12, 100 - cc)
}
</script>

<template>
  <section>
    <h2 class="font-display text-xl font-semibold text-ink-1 mb-2 flex items-center gap-2">
      <svg class="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10a4 4 0 014-4 5 5 0 019.584 1.243A3.5 3.5 0 0120.5 14H6a3 3 0 01-3-3z" />
        <circle cx="7" cy="19" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
        <circle cx="17" cy="19" r="1" fill="currentColor" stroke="none" />
      </svg>
      {{ t('historical.title') }}
    </h2>

    <p class="text-sm text-ink-2 mb-4">
      <span v-if="history.total_years > 0" class="font-mono">
        <span class="text-status-green font-semibold">{{ history.clear_years }}</span>
        <span class="text-ink-3"> / </span>
        <span>{{ history.total_years }}</span>
      </span>
      <span class="ml-2">{{ t('historical.summary_suffix') }}</span>
      <span v-if="history.avg_cloud_cover != null" class="text-ink-3 font-mono">
        &middot; {{ t('historical.avg', { pct: history.avg_cloud_cover }) }}
      </span>
    </p>

    <!-- Bar chart -->
    <div class="hw-chart" role="group" :aria-label="t('historical.chart_aria')">
      <div
        v-for="point in history.years"
        :key="point.year"
        class="hw-col"
      >
        <div class="hw-bar-slot">
          <div
            class="hw-bar"
            :class="`hw-bar--${bandFor(point.cloud_cover)}`"
            :style="{ height: `${clearnessHeight(point.cloud_cover)}%` }"
            :title="point.cloud_cover != null
              ? t('historical.tooltip', { year: point.year, pct: point.cloud_cover })
              : t('historical.tooltip_nodata', { year: point.year })"
          />
        </div>
        <span class="hw-year">{{ String(point.year).slice(-2) }}</span>
      </div>
    </div>

    <!-- Legend + caveat -->
    <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-ink-3 uppercase tracking-[0.18em]">
      <span class="flex items-center gap-1.5">
        <span class="hw-chip hw-bar--clear" /> {{ t('historical.band_clear') }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="hw-chip hw-bar--partly" /> {{ t('historical.band_partly') }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="hw-chip hw-bar--overcast" /> {{ t('historical.band_overcast') }}
      </span>
    </div>

    <p class="mt-3 text-xs italic text-ink-3 leading-relaxed">
      {{ t('historical.caveat') }}
    </p>
  </section>
</template>

<style scoped>
.hw-chart {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
  align-items: end;
  padding: 12px 10px 6px;
  border: 1px solid rgb(var(--border-subtle) / 0.5);
  border-radius: 4px;
  background: rgb(var(--surface) / 0.6);
}

.hw-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.hw-bar-slot {
  width: 100%;
  height: 96px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.hw-bar {
  width: 100%;
  max-width: 28px;
  border-radius: 2px 2px 0 0;
  transition: filter 0.15s ease, transform 0.15s ease;
  cursor: default;
}
.hw-bar:hover {
  filter: brightness(1.15);
  transform: scaleY(1.03);
  transform-origin: bottom;
}

.hw-year {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  color: rgb(var(--ink-3));
  letter-spacing: 0.05em;
}
.hw-year::before { content: "'"; }

.hw-chip {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

/* Band colors — dark defaults, light overrides */
.hw-bar--clear    { background: #4ade80; }
.hw-bar--partly   { background: #facc15; }
.hw-bar--overcast { background: #ef4444; }
.hw-bar--unknown  { background: rgb(var(--ink-3) / 0.4); }

html.light .hw-bar--clear    { background: #16a34a; }
html.light .hw-bar--partly   { background: #d97706; }
html.light .hw-bar--overcast { background: #b91c1c; }
</style>
