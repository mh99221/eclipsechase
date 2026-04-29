// Dock mode + per-mode context shapes for MapDock and its children.
// Mode is driven by tapping things on the map (or the HORIZON button on
// the SPOT card). Each ctx is populated by the parent (`map.vue`) from
// the tap target's data.

export type DockMode = 'spot' | 'weather' | 'roads' | 'cam' | 'horizon'

export interface DockSpotData {
  slug: string
  name: string
  lat: number
  lng: number
  totality_duration_seconds: number
  /** Cloud %, or null if no nearby station / no historical data. */
  cloud: number | null
}

export interface DockWeatherCtx {
  /** Weather-station name. */
  name: string
  /** Cloud cover percentage 0–100, or null if no recent observation. */
  cloud: number | null
  /** Most-recent observation age in minutes (for "UPDATED N MIN"). */
  updatedMinutes: number | null
  /** Visibility in km, if the station reports it. */
  visibilityKm: number | null
}

import type { TrafficCondition } from '~/utils/traffic'

export interface DockRoadsCtx {
  /** Normalised condition bucket — reuses the existing traffic union
   *  so the dock and the rest of the traffic stack stay in lockstep. */
  cond: TrafficCondition
  /** Human label (already localised) — e.g. "Difficult". */
  label: string
  /** Sub-label — road name, hazard description, etc. */
  detail: string
}

/** Re-exported so dock-mode consumers don't need a second import. */
export type { TrafficCondition } from '~/utils/traffic'

export interface DockCamImage {
  url: string
  description: string
}

export interface DockCamCtx {
  id: string | number
  name: string
  /** Direction blurb (the API description). */
  dir: string
  images: DockCamImage[]
  /** Current carousel index. */
  idx: number
}

export interface DockHorizonCtx {
  lat: number
  lng: number
  /** When provided, dock subtitle reads "<verdict text> · <name>".
   *  Set when HORIZON was opened from a spot pin; null when from a bare-map tap. */
  spotName: string | null
}
