<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import { cloudColor, cloudLevel, formatDuration, weatherSvgHtml } from '~/utils/eclipse'
import { addEclipsePathLayers } from '~/utils/mapLayers'
import { MAP_CONFIG, MARKER_SIZES } from '~/utils/mapConfig'
import { computeMinZooms, setMarkerVisibility } from '~/utils/mapMarkers'
import { readCssVar } from '~/utils/theme'
import type { MapSpot } from '~/types/spots'

const props = defineProps<{
  stations?: Array<{
    station_id: string
    name: string
    lat: number
    lng: number
    region: string
    cloud_cover?: number | null
  }>
  spots?: MapSpot[]
  rankedSpots?: Array<{
    slug: string
    rank: number
    score: number
    filtered: boolean
  }>
  /** Historical weather by slug — surfaces a 10-year clearness stat in spot popups. */
  historical?: Record<string, { clear_years: number; total_years: number; avg_cloud_cover: number | null }> | null
  focusSpot?: string | null
  initialCenter?: [number, number] | null
  initialZoom?: number | null
  /** When true, station + spot marker popups are not attached. Mobile
   *  uses the bottom dock instead, so popups would duplicate the same
   *  data. Click events still fire so the parent can drive the dock. */
  suppressPopups?: boolean
  /** Slug of the currently-selected spot. The matching marker renders
   *  with a distinctive red pin so it's findable on the map. */
  selectedSlug?: string | null
  /** id of the currently-selected weather station — same red-highlight
   *  treatment as the selected spot. */
  selectedStationId?: string | null
}>()

type StationData = NonNullable<typeof props.stations>[number]

const emit = defineEmits<{
  mapClick:      [coords: { lat: number; lng: number }]
  /** Fired when a spot marker is clicked. Drives the dock SPOT mode. */
  spotSelect:    [slug: string]
  /** Fired when a weather-station marker is clicked. Drives the dock WEATHER mode. */
  weatherSelect: [station: StationData]
}>()

const router = useRouter()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const { t } = useI18n()
const mapContainer = ref<HTMLElement | null>(null)
let map: mapboxgl.Map | null = null
const mapExposed = shallowRef<mapboxgl.Map | null>(null)

// Persistent marker cache. Keyed by stable id (station_id / slug) so
// incremental updates (cloud-cover refresh, rank change, theme swap)
// mutate the existing DOM + popup in place instead of destroying and
// recreating all markers on every watcher fire.
interface CachedMarker {
  marker: mapboxgl.Marker
  el: HTMLElement
  popup: mapboxgl.Popup
  minZoom: number
}
interface CachedStationMarker extends CachedMarker {
  /** Latest station snapshot, kept current so click → weatherSelect
   *  emits the freshest cloud-cover. */
  station: StationData
}

const stationMarkers = new Map<string, CachedStationMarker>()
const spotMarkers = new Map<string, CachedMarker>()

/** Find nearest station's cloud cover for a given lat/lng */
function nearestCloudCover(lat: number, lng: number): number | null {
  if (!props.stations?.length) return null
  let best: number | null = null
  let bestDist = Infinity
  for (const s of props.stations) {
    if (s.cloud_cover == null) continue
    const d = (s.lat - lat) ** 2 + (s.lng - lng) ** 2
    if (d < bestDist) {
      bestDist = d
      best = s.cloud_cover
    }
  }
  return best
}

function applyZoomVisibility() {
  if (!map) return
  const zoom = map.getZoom()
  setMarkerVisibility(stationMarkers.values(), zoom)
  setMarkerVisibility(spotMarkers.values(), zoom)
}

function addEclipsePath() {
  if (!map) return
  addEclipsePathLayers(map, {
    colors: {
      accent:       readCssVar('--accent', '#f59e0b'),
      accentStrong: readCssVar('--accent-strong', '#fbbf24'),
    },
  })
}

type Station = StationData

function stationPopupHtml(station: Station): string {
  const color = cloudColor(station.cloud_cover)
  // Use semantic token vars inline so the popup body follows light/dark
  // mode (popup container background already swaps via .eclipse-popup).
  const ink = `rgb(var(--ink-1))`
  const inkDim = `rgb(var(--ink-1) / 0.62)`
  return `
    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: ${ink}; padding: 4px;">
      <h3 style="font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 14px; margin: 0 0 6px;">${station.name}</h3>
      <dl style="margin: 0; display: flex; flex-direction: column; gap: 2px;">
        ${station.cloud_cover != null ? `<div><dt style="display:inline;color:${inkDim};">Cloud cover:</dt> <dd style="display:inline;color:${color};margin:0;">${station.cloud_cover}%</dd></div>` : ''}
      </dl>
    </div>
  `
}

// Apply just the selection-dependent style props (opacity / z-index /
// filter / aria) to a station marker element. Set via individual
// properties so Mapbox's `transform` (positioning) on this same element
// is preserved — `el.style.cssText = "..."` would clobber it, and
// outside of a map move/zoom event Mapbox does not re-apply transform.
function applyStationStyle(el: HTMLElement, station: Station) {
  const color = cloudColor(station.cloud_cover)
  const isSelected = !!props.selectedStationId && station.station_id === props.selectedStationId
  el.style.cursor = 'pointer'
  el.style.lineHeight = '0'
  if (isSelected) {
    // Selected: red ring + halo (matches selected-spot pin styling).
    el.style.opacity = '1'
    el.style.zIndex = '3'
    el.style.filter = 'drop-shadow(0 0 6px #D85848) drop-shadow(0 0 14px #D85848aa)'
  } else {
    el.style.opacity = '0.6'
    el.style.zIndex = '0'
    el.style.filter = `drop-shadow(0 0 6px ${color}55) drop-shadow(0 0 14px ${color}30)`
  }
  el.setAttribute('aria-label', `${station.name} weather station${station.cloud_cover != null ? `, ${station.cloud_cover}% cloud cover` : ''}${isSelected ? ', selected' : ''}`)
}

function renderStationInto(el: HTMLElement, station: Station) {
  applyStationStyle(el, station)
  el.innerHTML = weatherSvgHtml(station.cloud_cover, 42)
}

function updateMarkers() {
  if (!map || !props.stations) return

  const minZooms = computeMinZooms(props.stations.map(s => ({ lat: s.lat, lng: s.lng })))
  const seen = new Set<string>()

  const currentZoom = map.getZoom()
  for (let i = 0; i < props.stations.length; i++) {
    const station = props.stations[i]!
    seen.add(station.station_id)
    let cached = stationMarkers.get(station.station_id)

    if (!cached) {
      const el = document.createElement('div')
      el.className = 'station-marker'
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '0')
      // Render + popup html BEFORE addTo(map) so the element has
      // proper size when Mapbox computes its initial wrapper
      // transform — otherwise new markers can sit invisibly until
      // the next map move/zoom event fires.
      renderStationInto(el, station)
      const popup = new mapboxgl.Popup({
        offset: 12,
        closeButton: false,
        maxWidth: 'min(220px, 85vw)',
        className: 'eclipse-popup',
      }).setHTML(stationPopupHtml(station))
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([station.lng, station.lat])
        .addTo(map)
      // Popup attaches only when the parent isn't suppressing them.
      // Mobile (where the dock renders the same data) sets
      // suppressPopups=true so we don't double up.
      if (!props.suppressPopups) marker.setPopup(popup)
      // Always emit the click so the parent can drive the dock,
      // regardless of popup state. Listener bound once at marker
      // creation; the station_id is stable since it keys the cache.
      // stopPropagation defends against the click also reaching the
      // map's bare-map handler — without it, an upstream race could
      // overwrite the dock mode the parent just set.
      const stationId = station.station_id
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        const current = stationMarkers.get(stationId)
        if (current) emit('weatherSelect', current.station)
      })
      cached = { marker, el, popup, minZoom: minZooms[i]!, station }
      stationMarkers.set(station.station_id, cached)
    } else {
      cached.minZoom = minZooms[i]!
      cached.station = station
      renderStationInto(cached.el, station)
      cached.popup.setHTML(stationPopupHtml(station))
    }
    // Re-apply visibility inline after every render — renderInto
    // wipes cssText which could clobber prior visibility state.
    setMarkerVisibility([cached], currentZoom)
  }

  for (const [id, cached] of stationMarkers) {
    if (!seen.has(id)) {
      cached.marker.remove()
      stationMarkers.delete(id)
    }
  }
  applyZoomVisibility()
}

type Spot = MapSpot
type RankInfo = { rank: number; score: number; filtered: boolean }

interface ThemeColors {
  accent: string
  accentStrong: string
  markerBg: string
  mutedInk: string
  ink1: string
  ink2: string
  ink3: string
}

function readThemeColors(): ThemeColors {
  return {
    accent:       readCssVar('--accent',        '#f59e0b'),
    accentStrong: readCssVar('--accent-strong', '#fbbf24'),
    markerBg:     readCssVar('--bg',            '#050810'),
    mutedInk:     readCssVar('--ink-3',         '#94a3b8'),
    ink1:         readCssVar('--ink-1',         '#e2e8f0'),
    ink2:         readCssVar('--ink-2',         '#cbd5e1'),
    ink3:         readCssVar('--ink-3',         '#94a3b8'),
  }
}

function renderSpotInto(el: HTMLElement, spot: Spot, rankInfo: RankInfo | undefined, colors: ThemeColors) {
  const hasRanking = !!rankInfo
  const isFiltered = rankInfo?.filtered === true
  const isTop3 = hasRanking && !isFiltered && rankInfo!.rank <= 3
  const isSelected = !!props.selectedSlug && spot.slug === props.selectedSlug

  el.setAttribute('aria-label', `${spot.name} viewing spot, ${formatDuration(spot.totality_duration_seconds)} totality${hasRanking && !isFiltered ? `, rank ${rankInfo!.rank}` : ''}${isSelected ? ', selected' : ''}`)
  el.textContent = '' // clear any prior inner content

  // Selected pin — distinctive red so the user can find their pick on
  // the map at a glance. Slightly larger than the standard pin and with
  // a softer halo. Wins regardless of ranking/filter state.
  if (isSelected) {
    el.style.cssText = `
      width: ${MARKER_SIZES.selected}px; height: ${MARKER_SIZES.selected}px; border-radius: 50%;
      background: ${colors.markerBg}; border: 2px solid #D85848;
      box-shadow: 0 0 14px rgba(216, 88, 72, 0.5); cursor: pointer; z-index: 11;
      display: flex; align-items: center; justify-content: center;
    `
    const inner = document.createElement('div')
    inner.style.cssText = `width: 11px; height: 11px; border-radius: 50%; background: #D85848;`
    el.appendChild(inner)
    return
  }

  // Sizes: 20% smaller than prior revision, inner dot sized at the
  // legend's 6/14 ratio (~43%) so map markers match the legend visual.
  // Border stays at 2px (legend border width).
  if (isFiltered) {
    el.style.cssText = `
      width: ${MARKER_SIZES.filtered}px; height: ${MARKER_SIZES.filtered}px; border-radius: 50%;
      background: ${colors.markerBg}; border: 2px solid ${colors.mutedInk};
      opacity: 0.4; cursor: pointer; z-index: 10;
      display: flex; align-items: center; justify-content: center;
    `
    const inner = document.createElement('div')
    inner.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background: ${colors.mutedInk};`
    el.appendChild(inner)
  } else if (hasRanking) {
    const size = isTop3 ? MARKER_SIZES.top3 : MARKER_SIZES.ranked
    const borderColor = isTop3 ? colors.accent : colors.accentStrong
    const shadow = isTop3
      ? `0 0 14px rgb(var(--accent) / 0.4)`
      : `0 0 8px rgb(var(--accent) / 0.2)`
    el.style.cssText = `
      width: ${size}px; height: ${size}px; border-radius: 50%;
      background: ${colors.markerBg}; border: 2px solid ${borderColor};
      box-shadow: ${shadow}; cursor: pointer; z-index: 10;
      display: flex; align-items: center; justify-content: center;
      font-family: 'IBM Plex Mono', monospace; font-size: ${isTop3 ? 11 : 9}px;
      font-weight: 700; color: ${isTop3 ? colors.accent : colors.accentStrong};
    `
    el.textContent = String(rankInfo!.rank)
  } else {
    el.style.cssText = `
      width: ${MARKER_SIZES.unranked}px; height: ${MARKER_SIZES.unranked}px; border-radius: 50%;
      background: ${colors.markerBg}; border: 2px solid ${colors.accent};
      box-shadow: 0 0 12px rgb(var(--accent) / 0.25); cursor: pointer; z-index: 10;
      display: flex; align-items: center; justify-content: center;
    `
    const inner = document.createElement('div')
    inner.style.cssText = `width: 9px; height: 9px; border-radius: 50%; background: ${colors.accent};`
    el.appendChild(inner)
  }
}

function spotPopupHtml(spot: Spot, rankInfo: RankInfo | undefined, colors: ThemeColors): string {
  const isFiltered = rankInfo?.filtered === true
  const spotCloud = nearestCloudCover(spot.lat, spot.lng)
  const weatherIcon = weatherSvgHtml(spotCloud, 28)
  const weatherLabel = t(cloudLevel(spotCloud).labelKey)
  const weatherColor = cloudColor(spotCloud)

  const scoreHtml = rankInfo && !isFiltered
    ? `<div style="margin-top: 4px; color: ${rankInfo.score >= 80 ? '#22c55e' : rankInfo.score >= 50 ? '#fbbf24' : '#ef4444'};">${t('popup.score_line', { score: rankInfo.score })}</div>`
    : ''

  const spotHist = props.historical?.[spot.slug]
  const histHtml = spotHist && spotHist.total_years > 0
    ? `<div style="margin-top: 4px; color: ${colors.ink3}; font-size: 11px;">
         10y: <span style="color: ${colors.ink2}">${spotHist.clear_years}/${spotHist.total_years}</span> clear${spotHist.avg_cloud_cover != null ? ` · avg ${spotHist.avg_cloud_cover}% cloud` : ''}
       </div>`
    : ''

  return `
    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: ${colors.ink1}; padding: 4px; cursor: pointer;" data-slug="${spot.slug}">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
        <h3 style="font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 14px; color: ${colors.accentStrong}; margin: 0;">${spot.name}</h3>
        <div style="flex-shrink: 0; line-height: 0;" aria-hidden="true">${weatherIcon}</div>
      </div>
      <dl style="margin: 0; display: flex; align-items: center; gap: 10px;">
        <div><dt style="display:inline;color:${colors.ink3};">Totality:</dt> <dd style="display:inline;margin:0;">${formatDuration(spot.totality_duration_seconds)}</dd></div>
        <dd style="color: ${weatherColor}; font-size: 11px; margin: 0;">${weatherLabel}</dd>
      </dl>
      ${histHtml}
      ${scoreHtml}
      <p style="margin: 6px 0 0; color: ${colors.accent}; font-size: 11px;">Click for details →</p>
    </div>
  `
}

// One delegated listener per popup container wires the "Click for
// details →" navigation. `popup.getElement()` is a stable reference
// across open/close, so binding once with a dataset flag is safe even
// when setHTML replaces the content.
function wireSpotPopupNavigation(popup: mapboxgl.Popup) {
  popup.on('open', () => {
    const root = popup.getElement()
    if (!root || (root as HTMLElement).dataset.navWired === '1') return
    ;(root as HTMLElement).dataset.navWired = '1'
    root.addEventListener('click', (ev) => {
      const target = (ev.target as HTMLElement).closest('[data-slug]') as HTMLElement | null
      const slug = target?.getAttribute('data-slug')
      if (!slug || !map) return
      const center = map.getCenter()
      const zoom = map.getZoom().toFixed(1)
      // localePath() prepends the active locale prefix (e.g. /is) so a
      // user clicking a Mapbox popup on /is/map lands on /is/spots/<slug>
      // and stays in their language. Without it the popup would drop
      // them into the EN spot detail.
      router.push(`${localePath(`/spots/${slug}`)}?mlat=${center.lat.toFixed(4)}&mlng=${center.lng.toFixed(4)}&mzoom=${zoom}`)
    })
  })
}

function updateSpotMarkers() {
  if (!map || !props.spots) return

  const minZooms = computeMinZooms(props.spots.map(s => ({ lat: s.lat, lng: s.lng })))
  const colors = readThemeColors()

  const rankMap = new Map<string, RankInfo>()
  if (props.rankedSpots) {
    for (const r of props.rankedSpots) rankMap.set(r.slug, r)
  }
  const seen = new Set<string>()
  const currentZoom = map.getZoom()

  for (let i = 0; i < props.spots.length; i++) {
    const spot = props.spots[i]!
    const rankInfo = rankMap.get(spot.slug)
    const isTop3 = rankInfo && !rankInfo.filtered && rankInfo.rank <= 3
    seen.add(spot.slug)

    const minZoom = isTop3 ? 5 : minZooms[i]!
    let cached = spotMarkers.get(spot.slug)
    if (!cached) {
      const el = document.createElement('div')
      el.className = 'spot-marker'
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '0')
      // Render + popup html BEFORE addTo(map) so Mapbox sees a
      // properly-sized marker when computing its initial wrapper
      // transform — otherwise new markers can sit invisibly until
      // the next map move/zoom event fires.
      renderSpotInto(el, spot, rankInfo, colors)
      const popup = new mapboxgl.Popup({
        offset: 14,
        closeButton: false,
        maxWidth: 'min(260px, 85vw)',
        className: 'eclipse-popup',
      }).setHTML(spotPopupHtml(spot, rankInfo, colors))
      wireSpotPopupNavigation(popup)
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map)
      // Attach the popup only when the parent isn't suppressing them.
      // Mobile (where the dock renders the same data) sets
      // suppressPopups=true so we don't double up.
      if (!props.suppressPopups) marker.setPopup(popup)
      // Drive the v0 selected-lightbox on parent pages — fires regardless
      // of popup state. Listener bound once at marker creation; the slug
      // is stable since it keys the marker cache.
      // stopPropagation: same defence as station markers — prevents
      // Mapbox's bare-map click from racing with this emit.
      el.addEventListener('click', (e) => { e.stopPropagation(); emit('spotSelect', spot.slug) })
      cached = { marker, el, popup, minZoom }
      spotMarkers.set(spot.slug, cached)
    } else {
      cached.minZoom = minZoom
      // renderSpotInto wipes el.style.cssText, which clobbers any
      // visibility/pointer-events set by a previous zoom-visibility
      // pass. Re-render then re-apply visibility inline so the
      // marker never sits in a "rendered but stale visibility"
      // state between this call and the trailing batch pass.
      renderSpotInto(cached.el, spot, rankInfo, colors)
      cached.popup.setHTML(spotPopupHtml(spot, rankInfo, colors))
      // Force Mapbox to re-project and reapply the wrapper transform.
      // Without this the marker can sit at a stale screen position
      // until the next map move/zoom event fires (observed after
      // profile change).
      cached.marker.setLngLat(cached.marker.getLngLat())
    }
    setMarkerVisibility([cached], currentZoom)
  }

  for (const [slug, cached] of spotMarkers) {
    if (!seen.has(slug)) {
      cached.marker.remove()
      spotMarkers.delete(slug)
    }
  }
  applyZoomVisibility()
}

function focusOnSpot(slug: string) {
  if (!map) return
  const cached = spotMarkers.get(slug)
  if (!cached) return

  const lngLat = cached.marker.getLngLat()
  map.flyTo({ center: lngLat, zoom: MAP_CONFIG.focusZoom, duration: 1500 })
  setTimeout(() => cached.marker.togglePopup(), 1600)
}

watch(() => props.stations, updateMarkers, { deep: true })
// Targeted style toggle on selection change — touches only the
// previously-selected and newly-selected markers, and only updates
// styles (no SVG re-render). Avoids the full updateMarkers cycle
// (which recomputes minZooms + applyZoomVisibility) and the wasted
// innerHTML rebuild that renderStationInto would do.
watch(() => props.selectedStationId, (next, prev) => {
  if (prev) {
    const c = stationMarkers.get(prev)
    if (c) applyStationStyle(c.el, c.station)
  }
  if (next) {
    const c = stationMarkers.get(next)
    if (c) applyStationStyle(c.el, c.station)
  }
})
watch(() => props.spots, updateSpotMarkers)
watch(() => props.rankedSpots, updateSpotMarkers, { deep: true })
watch(() => props.historical, updateSpotMarkers, { deep: true })

// Re-render spot markers when the selected slug changes so the
// previously-selected pin reverts to its rank/default styling and the
// new one picks up the red highlight.
watch(() => props.selectedSlug, updateSpotMarkers)

// Attach or detach popups across cached markers when the suppression
// flag flips (e.g. user resizes from mobile to desktop without reload).
// Covers spot + station markers — both render dock equivalents on mobile.
watch(() => props.suppressPopups, (suppress) => {
  for (const cached of spotMarkers.values()) {
    if (suppress) cached.marker.setPopup(undefined as any)
    else cached.marker.setPopup(cached.popup)
  }
  for (const cached of stationMarkers.values()) {
    if (suppress) cached.marker.setPopup(undefined as any)
    else cached.marker.setPopup(cached.popup)
  }
})

const colorMode = useColorMode()
const mapboxStyleFor = (mode: string) =>
  mode === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11'

onMounted(() => {
  if (!mapContainer.value) return

  mapboxgl.accessToken = config.public.mapboxToken as string

  // Default zoom: 6 on mobile, 6.585 on desktop (~1.5x linear scale —
  // each Mapbox zoom level = 2x scale, so log2(1.5) ≈ 0.585 levels).
  // Desktop has more room than mobile, but we want to keep the whole
  // eclipse path comfortably in frame, not zoom in tightly.
  const isDesktop = window.matchMedia('(min-width: 768px)').matches
  const defaultZoom = isDesktop ? 6.585 : 6

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: mapboxStyleFor(colorMode.value),
    center: props.initialCenter || [-23.5, 65.0],
    zoom: props.initialZoom ?? defaultZoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    attributionControl: false,
  })

  // Attribution is required by Mapbox's TOS; the compact "i" button
  // is the least-obtrusive compliant form. Pinch / scroll-wheel zoom
  // covers the standalone +/- buttons, so no NavigationControl here.
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')

  map.on('load', () => {
    addEclipsePath()
    updateMarkers()
    updateSpotMarkers()

    if (props.focusSpot) {
      focusOnSpot(props.focusSpot)
    }
  })

  map.on('zoom', applyZoomVisibility)
  // Also re-apply on pan. Mapbox's own marker `_update()` runs on
  // every map move to reposition the wrapper, but we want our CSS
  // visibility pass to stay in sync too so a pan surfaces any
  // markers that ended up in a stale hidden state.
  map.on('move', applyZoomVisibility)

  // Emit click on empty map space (not on markers/popups)
  map.on('click', (e) => {
    // Check if any popup is open — if so, this click closes it, don't emit
    const openPopups = document.querySelectorAll('.mapboxgl-popup')
    if (openPopups.length > 0) return

    // Check if click target is a marker element. The named classes are
    // the ones we set ourselves; `.mapboxgl-marker` is Mapbox's auto-
    // applied class — we include it as a catch-all so any HTML marker
    // click (including ones we forgot to tag) is treated as a marker
    // click and never falls through to the bare-map handler.
    const target = e.originalEvent.target as HTMLElement
    if (target.closest('.station-marker, .spot-marker, .traffic-marker, .camera-marker, .mapboxgl-marker')) return

    emit('mapClick', { lat: e.lngLat.lat, lng: e.lngLat.lng })
  })

  mapExposed.value = map
})

// Swap Mapbox base style when the app theme toggles. setStyle tears
// down HTML markers, so clear the caches — updateMarkers() will
// recreate them once the new style finishes loading.
watch(() => colorMode.value, (mode) => {
  if (!map) return
  for (const { marker } of stationMarkers.values()) marker.remove()
  for (const { marker } of spotMarkers.values()) marker.remove()
  stationMarkers.clear()
  spotMarkers.clear()
  map.setStyle(mapboxStyleFor(mode))
  map.once('style.load', () => {
    addEclipsePath()
    updateMarkers()
    updateSpotMarkers()
  })
})

defineExpose({ map: mapExposed })

onUnmounted(() => {
  for (const { marker } of stationMarkers.values()) marker.remove()
  for (const { marker } of spotMarkers.values()) marker.remove()
  stationMarkers.clear()
  spotMarkers.clear()
  map?.remove()
  map = null
  mapExposed.value = null
})
</script>

<template>
  <div ref="mapContainer" class="w-full h-full" role="application" aria-label="Interactive weather map of western Iceland showing eclipse viewing conditions" />
</template>

<style>
/* Mapbox popup overrides — theme-aware */
.eclipse-popup {
  z-index: 20 !important;
}

.eclipse-popup .mapboxgl-popup-content {
  /* `--surface` is the rgb triple meant for /0.04 tints; `--surface-raised`
     is the solid panel colour (dark navy in dark, cream in light). */
  background: rgb(var(--surface-raised));
  border: 1px solid rgb(var(--border-subtle) / 0.4);
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.eclipse-popup .mapboxgl-popup-tip {
  border-top-color: rgb(var(--surface-raised));
}

@media (max-width: 639px) {
  .mapboxgl-ctrl-bottom-right .mapboxgl-ctrl-group {
    margin-bottom: 10px;
  }
}
</style>
