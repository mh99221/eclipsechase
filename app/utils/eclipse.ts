export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export const CLOUD_COVER_LEVELS = [
  { max: 20, color: '#22c55e', label: 'Clear' },
  { max: 40, color: '#f59e0b', label: 'Mostly clear' },
  { max: 60, color: '#f59e0b', label: 'Partly cloudy' },
  { max: 80, color: '#f97316', label: 'Mostly cloudy' },
  { max: 100, color: '#ef4444', label: 'Overcast' },
] as const

export const CLOUD_COVER_NO_DATA = { color: '#94a3b8', label: 'No data' } as const

export function cloudColor(cover: number | null | undefined): string {
  if (cover == null) return CLOUD_COVER_NO_DATA.color
  for (const level of CLOUD_COVER_LEVELS) {
    if (cover <= level.max) return level.color
  }
  return CLOUD_COVER_LEVELS[CLOUD_COVER_LEVELS.length - 1].color
}

export function cloudLevel(cover: number | null | undefined): { color: string; label: string } {
  if (cover == null) return CLOUD_COVER_NO_DATA
  for (const level of CLOUD_COVER_LEVELS) {
    if (cover <= level.max) return level
  }
  return CLOUD_COVER_LEVELS[CLOUD_COVER_LEVELS.length - 1]
}

export function weatherSvgHtml(cloudCover: number | null | undefined, size: number = 36): string {
  const level = cloudLevel(cloudCover)
  const c = level.color
  const w = size
  const h = size

  if (cloudCover == null) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="13" stroke="${c}" stroke-width="1" stroke-dasharray="3 2" fill="none" opacity="0.4"/>
      <text x="18" y="22" text-anchor="middle" fill="${c}" font-family="monospace" font-size="14" opacity="0.5">?</text>
    </svg>`
  }

  if (cloudCover <= 20) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs><radialGradient id="sg-${size}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </radialGradient></defs>
      <circle cx="18" cy="18" r="17" fill="url(#sg-${size})"/>
      <circle cx="18" cy="18" r="7.5" fill="${c}" fill-opacity="0.15" stroke="${c}" stroke-width="1.2"/>
      <line x1="18" y1="3" x2="18" y2="7" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <line x1="18" y1="29" x2="18" y2="33" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <line x1="3" y1="18" x2="7" y2="18" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <line x1="29" y1="18" x2="33" y2="18" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <line x1="7.4" y1="7.4" x2="10.2" y2="10.2" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
      <line x1="25.8" y1="25.8" x2="28.6" y2="28.6" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
      <line x1="7.4" y1="28.6" x2="10.2" y2="25.8" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
      <line x1="25.8" y1="10.2" x2="28.6" y2="7.4" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
    </svg>`
  }

  if (cloudCover <= 40) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs><radialGradient id="sg2-${size}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </radialGradient></defs>
      <circle cx="16" cy="16" r="15" fill="url(#sg2-${size})"/>
      <circle cx="16" cy="16" r="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.2"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
      <line x1="2" y1="16" x2="6" y2="16" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
      <line x1="6.1" y1="6.1" x2="8.9" y2="8.9" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.35"/>
      <ellipse cx="27" cy="28" rx="8" ry="5" fill="#0a1020" stroke="${c}" stroke-width="1" opacity="0.7"/>
      <ellipse cx="24" cy="26" rx="4" ry="3.5" fill="#0a1020" stroke="${c}" stroke-width="1" opacity="0.7"/>
    </svg>`
  }

  if (cloudCover <= 60) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs><radialGradient id="sg3-${size}" cx="40%" cy="35%" r="40%">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </radialGradient></defs>
      <circle cx="14" cy="13" r="13" fill="url(#sg3-${size})"/>
      <circle cx="14" cy="13" r="6" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-width="1.2"/>
      <line x1="14" y1="1" x2="14" y2="4.5" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <line x1="2" y1="13" x2="5.5" y2="13" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <line x1="5.5" y1="4.5" x2="7.8" y2="6.8" stroke="${c}" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
      <ellipse cx="20" cy="27" rx="12" ry="6.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="15" cy="23" rx="6" ry="5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="24" cy="24" rx="5" ry="4.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="20" cy="27" rx="11" ry="5.5" fill="#0a1020"/>
    </svg>`
  }

  if (cloudCover <= 80) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="12" cy="10" r="4" fill="${c}" fill-opacity="0.08" stroke="${c}" stroke-width="0.8" opacity="0.4"/>
      <ellipse cx="19" cy="25" rx="14" ry="7.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="13" cy="19" rx="7" ry="6" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="24" cy="20" rx="6" ry="5.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="19" cy="24" rx="13" ry="6.5" fill="#0a1020"/>
      <ellipse cx="18" cy="22" rx="10" ry="5" fill="#0a1020"/>
    </svg>`
  }

  return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <ellipse cx="20" cy="16" rx="10" ry="6" fill="#0a1020" stroke="${c}" stroke-width="0.8" opacity="0.4"/>
    <ellipse cx="18" cy="24" rx="14" ry="7" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
    <ellipse cx="11" cy="19" rx="7" ry="6" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
    <ellipse cx="24" cy="19.5" rx="6.5" ry="5.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
    <ellipse cx="18" cy="23" rx="13" ry="6" fill="#0a1020"/>
    <ellipse cx="17" cy="21" rx="10" ry="5" fill="#0a1020"/>
    <line x1="13" y1="30" x2="12" y2="34" stroke="${c}" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
    <line x1="18" y1="31" x2="17" y2="34.5" stroke="${c}" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
    <line x1="23" y1="30" x2="22" y2="34" stroke="${c}" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
  </svg>`
}

export const REGION_LABELS: Record<string, string> = {
  westfjords: 'Westfjords',
  snaefellsnes: 'Snæfellsnes',
  reykjanes: 'Reykjanes',
  reykjavik: 'Reykjavík',
  borgarfjordur: 'Borgarfjörður',
}

export const SPOT_TYPE_LABELS: Record<string, string> = {
  'drive-up': 'Drive-up',
  'short-walk': 'Short walk',
  'moderate-hike': 'Moderate hike',
  'serious-hike': 'Serious hike',
}
