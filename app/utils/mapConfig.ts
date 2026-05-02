/**
 * Shared Mapbox configuration constants for `EclipseMap.vue`.
 *
 * Centralised so zoom limits and spot-marker pixel sizes live in one
 * place instead of being scattered as inline literals across the
 * marker-render and map-init code paths.
 */

/**
 * Map zoom configuration.
 *  - `minZoom` / `maxZoom`: passed to the Mapbox Map constructor.
 *  - `focusZoom`: zoom level used by `focusOnSpot()` when the user
 *    deep-links into the map with `?spot=<slug>`.
 */
export const MAP_CONFIG = {
  minZoom: 5,
  maxZoom: 12,
  focusZoom: 10,
} as const

/**
 * Pixel widths for the round spot markers, keyed by render branch.
 * Heights match (markers are circular). Inner-dot / font sizes are
 * still derived inline because they only depend on the branch and
 * stay close to their styling block — hoisting them too would
 * obscure the visual intent of `renderSpotInto()`.
 */
export const MARKER_SIZES = {
  filtered: 18,
  unranked: 21,
  ranked: 21,
  top3: 24,
  selected: 26,
} as const
