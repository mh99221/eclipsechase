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
