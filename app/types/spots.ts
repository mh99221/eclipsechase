/**
 * Canonical region slugs for western Iceland in the path of totality.
 * Matches the `weather_stations.region` / `viewing_spots.region` DB values.
 */
export type Region = 'westfjords' | 'snaefellsnes' | 'reykjanes' | 'reykjavik' | 'borgarfjordur'

export const REGIONS: readonly Region[] = [
  'westfjords', 'snaefellsnes', 'borgarfjordur', 'reykjavik', 'reykjanes',
] as const

export type PhotoLicense = 'unsplash' | 'pixabay' | 'cc-by' | 'cc-by-sa' | 'cc0' | 'nasa-pd'

export interface SpotPhoto {
  filename: string
  alt: string
  credit: string
  credit_url?: string
  license: PhotoLicense
  is_hero: boolean
  horizon_view?: boolean
}
