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
  /** Forecasted cloud cover percentage 0–100 for the next slot, or null
   *  when we have no nearby forecast row. vedur's automatic stations do
   *  not report cloud cover in observations — this is always a forecast. */
  cloud: number | null
  /** ISO8601 valid-time of the forecast row that produced `cloud`, used
   *  to render "Forecast for HH:mm". Null when `cloud` is null. */
  forecastValidAt: string | null
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
  /** ISO8601 timestamp of the latest condition reading from vegagerdin
   *  for this road/hazard. Null when the click target had no fresh
   *  reading (e.g. unknown segments). */
  updatedAt: string | null
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

import type { HorizonCheck } from '~/types/horizon'

export interface DockHorizonCtx {
  lat: number
  lng: number
  /** When provided, dock subtitle reads "<verdict text> · <name>".
   *  Set when HORIZON was opened from a spot pin; null when from a bare-map tap. */
  spotName: string | null
  /** Pre-computed horizon_check from viewing_spots, sampled at the exact
   *  spot coordinates by scripts/recompute-spot-horizons.mjs. When set,
   *  DockHorizon skips the grid-snap API call and renders this directly,
   *  so curated spots and their /spots/[slug] Sky tab always agree.
   *  Null for bare-map taps and for spots that don't have a stored check. */
  horizonCheck: HorizonCheck | null
  /** Pre-computed totality duration in seconds (from viewing_spots).
   *  Used to populate the response shape when bypassing the API. */
  totalityDurationSeconds: number | null
}
