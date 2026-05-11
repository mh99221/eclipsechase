export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export type CloudLevelKey = 'clear' | 'mostly-clear' | 'partly-cloudy' | 'mostly-cloudy' | 'overcast'

// `label` is the English fallback (kept for code paths that don't
// have access to useI18n), `labelKey` is the i18n lookup that
// rendering surfaces should use to follow the active locale.
export const CLOUD_COVER_LEVELS = [
  { key: 'clear',         max: 20,  color: '#38bdf8', label: 'Clear',          labelKey: 'cloud.clear' },
  { key: 'mostly-clear',  max: 40,  color: '#60a5fa', label: 'Mostly clear',   labelKey: 'cloud.mostly_clear' },
  { key: 'partly-cloudy', max: 60,  color: '#818cf8', label: 'Partly cloudy',  labelKey: 'cloud.partly_cloudy' },
  { key: 'mostly-cloudy', max: 80,  color: '#94a3b8', label: 'Mostly cloudy',  labelKey: 'cloud.mostly_cloudy' },
  { key: 'overcast',      max: 100, color: '#64748b', label: 'Overcast',       labelKey: 'cloud.overcast' },
] as const satisfies ReadonlyArray<{ key: CloudLevelKey; max: number; color: string; label: string; labelKey: string }>

export const CLOUD_COVER_NO_DATA = { key: 'no-data' as const, color: '#475569', label: 'No data', labelKey: 'cloud.no_data' } as const

export type CloudLevel = (typeof CLOUD_COVER_LEVELS)[number] | typeof CLOUD_COVER_NO_DATA

export function cloudColor(cover: number | null | undefined): string {
  return cloudLevel(cover).color
}

export function cloudLevel(cover: number | null | undefined): CloudLevel {
  if (cover == null) return CLOUD_COVER_NO_DATA
  for (const level of CLOUD_COVER_LEVELS) {
    if (cover <= level.max) return level
  }
  // CLOUD_COVER_LEVELS is a non-empty const tuple — TS still sees the
  // final lookup as `union | undefined` under noUncheckedIndexedAccess.
  // The fallback is reachable only when cover > 100, treat as overcast.
  return CLOUD_COVER_LEVELS[CLOUD_COVER_LEVELS.length - 1]!
}

// Cloud path templates (single-outline, puffy cumulus style)
const CLOUD_PATH_SM = 'M17,29 L32,29 C34,29 35,26 33,25 C34,22 31,21 29,22 C28,19 24,18 22,21 C20,19 17,21 18,24 C15,24 15,28 17,29 Z'
const CLOUD_PATH_MD = 'M8,27 L30,27 C33,27 34,23 31,21 C33,17 29,14 25,16 C24,11 18,10 16,14 C13,10 7,13 9,18 C5,17 3,22 6,25 C4,27 6,27 8,27 Z'
const CLOUD_PATH_LG = 'M6,23 L31,23 C34,23 35,19 32,17 C34,13 30,10 26,12 C25,7 19,6 17,10 C14,6 8,9 10,14 C6,13 4,18 7,21 C4,23 5,23 6,23 Z'
const STROKE_WIDTH = 1.8

export function weatherSvgHtml(cloudCover: number | null | undefined, size: number = 36): string {
  const level = cloudLevel(cloudCover)
  const c = level.color
  const w = size
  const h = size
  const sw = STROKE_WIDTH

  // No data
  if (cloudCover == null) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="12" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 2" fill="none" opacity="0.5"/>
      <text x="18" y="22" text-anchor="middle" fill="${c}" font-family="monospace" font-size="13" opacity="0.6">?</text>
    </svg>`
  }

  // Clear — sun with 8 rays
  if (cloudCover <= 20) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="5.5" stroke="${c}" stroke-width="${sw}" fill="none"/>
      <line x1="18" y1="4" x2="18" y2="9" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="18" y1="27" x2="18" y2="32" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="4" y1="18" x2="9" y2="18" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="27" y1="18" x2="32" y2="18" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="8.1" y1="8.1" x2="11.6" y2="11.6" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="24.4" y1="24.4" x2="27.9" y2="27.9" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="8.1" y1="27.9" x2="11.6" y2="24.4" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="24.4" y1="11.6" x2="27.9" y2="8.1" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`
  }

  // Mostly clear — sun (top-left) with small cloud (bottom-right)
  if (cloudCover <= 40) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="5" stroke="${c}" stroke-width="${sw}" fill="none"/>
      <line x1="13" y1="1" x2="13" y2="5" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="1" y1="13" x2="5" y2="13" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="13" y1="21" x2="13" y2="24" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="21" y1="13" x2="24" y2="13" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="5.5" y1="5.5" x2="8.2" y2="8.2" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="17.8" y1="8.2" x2="20.5" y2="5.5" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <line x1="5.5" y1="20.5" x2="8.2" y2="17.8" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <path d="${CLOUD_PATH_SM}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" fill="none"/>
    </svg>`
  }

  // Partly cloudy — medium cloud in front, sun peeking behind (top-right)
  if (cloudCover <= 60) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="27" cy="9" r="4.5" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.55"/>
      <line x1="27" y1="0" x2="27" y2="2.5" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
      <line x1="34" y1="9" x2="31.5" y2="9" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
      <line x1="31.9" y1="4.1" x2="30" y2="6" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
      <line x1="31.9" y1="13.9" x2="30" y2="12" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
      <path d="${CLOUD_PATH_MD}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" fill="none"/>
    </svg>`
  }

  // Mostly cloudy — large cloud, faint sun barely visible
  if (cloudCover <= 80) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="28" cy="7" r="3.5" stroke="${c}" stroke-width="1.2" fill="none" opacity="0.3"/>
      <line x1="28" y1="0.5" x2="28" y2="2" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.3"/>
      <line x1="34" y1="7" x2="32.5" y2="7" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.3"/>
      <line x1="32.5" y1="3.5" x2="31.2" y2="4.8" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.3"/>
      <path d="${CLOUD_PATH_LG}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" fill="none"/>
    </svg>`
  }

  // Overcast — cloud with rain streaks
  return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <path d="${CLOUD_PATH_LG}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" fill="none"/>
    <line x1="11" y1="26" x2="9.5" y2="31" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/>
    <line x1="17" y1="26" x2="15.5" y2="31" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    <line x1="23" y1="26" x2="21.5" y2="31" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/>
    <line x1="29" y1="25.5" x2="27.5" y2="30" stroke="${c}" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>
  </svg>`
}

import type { Region } from '~/types/spots'

export const REGION_LABELS: Record<Region, string> = {
  westfjords: 'Westfjords',
  snaefellsnes: 'Snæfellsnes',
  reykjanes: 'Reykjanes',
  reykjavik: 'Reykjavík',
  borgarfjordur: 'Borgarfjörður',
}

/**
 * Display label for a region slug. If a translator function is passed,
 * it's tried first against `region.<slug>` so the label follows the
 * active locale (e.g. "Vestfirðir" on /is/*). Without a translator —
 * or when the i18n key is missing — falls back to the static English
 * names in REGION_LABELS, then to the raw slug.
 */
export function regionLabel(
  region: string | null | undefined,
  t?: (key: string) => string,
): string {
  if (!region) return ''
  if (t) {
    const localized = t(`region.${region}`)
    // vue-i18n returns the key itself when missing, so guard against that.
    if (localized && localized !== `region.${region}`) return localized
  }
  return REGION_LABELS[region as Region] ?? region
}

export const SPOT_TYPE_LABELS: Record<string, string> = {
  'drive-up': 'Drive-up',
  'short-walk': 'Short walk',
  'moderate-hike': 'Moderate hike',
  'serious-hike': 'Serious hike',
}

// Horizon verdict styling — single source of truth shared across
// HorizonBadge (full chip), HorizonProfile/EclipseMap (raw colour),
// and spots/index.vue (ec-chip-* class).
export const HORIZON_VERDICT_STYLES: Record<string, {
  color: string
  bg: string
  border: string
  chip: string
}> = {
  clear:    { color: '#22c55e', bg: 'bg-green-500/10',  border: 'border-green-500/30',  chip: 'ec-chip-green'  },
  marginal: { color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', chip: 'ec-chip-yellow' },
  risky:    { color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30', chip: 'ec-chip-orange' },
  blocked:  { color: '#ef4444', bg: 'bg-red-500/10',    border: 'border-red-500/30',    chip: 'ec-chip-red'    },
}

export const HORIZON_VERDICT_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(HORIZON_VERDICT_STYLES).map(([k, v]) => [k, v.color]),
)

// Parse a JSONB column that may arrive as string (PostgREST) or native
// (client-decoded). Returns the fallback on any shape mismatch.
export function parseJsonb<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as T } catch { return fallback }
  }
  return raw as T
}

export function formatTrailTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}min`
}

// 16-point compass direction from azimuth degrees
export function compassDirection(azimuth: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(azimuth / 22.5) % 16
  return dirs[index]!
}
