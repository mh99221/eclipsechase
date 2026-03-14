export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export const CLOUD_COVER_LEVELS = [
  { max: 25, color: '#22c55e', label: 'Clear' },
  { max: 50, color: '#f59e0b', label: 'Partly cloudy' },
  { max: 75, color: '#f97316', label: 'Mostly cloudy' },
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
