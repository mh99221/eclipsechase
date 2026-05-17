<script setup lang="ts">
import type { Region } from '~/types/spots'
import { readCssVar } from '~/utils/theme'

const config = useRuntimeConfig()
const colorMode = useColorMode()
const { t } = useI18n()
const mapContainer = ref<HTMLElement | null>(null)
const mapError = ref('')
// An IntersectionObserver gates the mapbox-gl dynamic import so visitors
// who never scroll to the map section don't pay the 1.5 MB download.
// The same component renders inside <ClientOnly> so the observer + the
// dynamic import only ever fire in the browser.
let map: any = null

const mapboxStyleFor = (mode: string) =>
  mode === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11'

/** Re-add eclipse path with current theme colors. */
function applyEclipsePath() {
  if (!map) return
  // Dynamically import to keep the initial bundle small
  import('~/utils/mapLayers').then(({ addEclipsePathLayers }) => {
    addEclipsePathLayers(map, {
      borderWidth: 1,
      centerlineOpacity: 0.8,
      colors: {
        accent:       readCssVar('--accent',        '#f59e0b'),
        accentStrong: readCssVar('--accent-strong', '#fbbf24'),
      },
    })
  })
}

// Observe the placeholder container; kick off the map init the first
// time it crosses into (or near) the viewport. 400 px rootMargin gives
// a small pre-fetch lead so the map is already initialising by the time
// the user scrolls it into view, hiding latency without paying the cost
// for visitors who never reach the section.
let io: IntersectionObserver | null = null
let initStarted = false

async function initMap() {
  if (initStarted) return
  initStarted = true
  const el = mapContainer.value
  if (!el) {
    initStarted = false
    return
  }

  const token = config.public.mapboxToken as string
  if (!token) {
    mapError.value = t('map_error.no_token')
    return
  }

  try {
    const [{ default: mapboxgl }, { regionLabel }] = await Promise.all([
      import('mapbox-gl'),
      import('~/utils/eclipse'),
      // CSS rides along in its own chunk; Vite handles the import.
      // @ts-expect-error - CSS module has no type declaration
      import('mapbox-gl/dist/mapbox-gl.css'),
    ])

    mapboxgl.accessToken = token

    map = new mapboxgl.Map({
      container: el,
      style: mapboxStyleFor(colorMode.value),
      center: [-22.5, 65.0],
      zoom: 5.5,
      interactive: false,
      attributionControl: false,
    })

    map.on('load', () => {
      if (!map) return

      applyEclipsePath()

      const REGION_MARKERS: Array<{ key: Region; lng: number; lat: number }> = [
        { key: 'westfjords',    lng: -22.8, lat: 65.8  },
        { key: 'snaefellsnes',  lng: -23.5, lat: 64.85 },
        { key: 'borgarfjordur', lng: -21.5, lat: 64.7  },
        { key: 'reykjanes',     lng: -22.2, lat: 63.95 },
      ]

      for (const region of REGION_MARKERS) {
        const el = document.createElement('div')
        el.className = 'guide-map-label'
        el.textContent = regionLabel(region.key, t)

        new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([region.lng, region.lat])
          .addTo(map!)
      }
    })

    map.on('error', (e: any) => {
      console.error('[GuidePathMap] Mapbox error:', e)
      mapError.value = t('map_error.failed_to_load')
    })
  } catch (err: any) {
    console.error('[GuidePathMap]', err)
    mapError.value = err.message || t('map_error.failed_to_load')
  }
}

// The template ref binds when <ClientOnly> renders its default slot
// post-hydration. Watching the ref means we attach the observer the
// first time the element actually exists in the DOM, regardless of how
// many ticks ClientOnly takes to swap from fallback to default.
watch(mapContainer, (el) => {
  if (!el || io || map) return
  if (typeof IntersectionObserver === 'undefined') {
    initMap()
    return
  }
  io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        io?.disconnect()
        io = null
        initMap()
        break
      }
    }
  }, { rootMargin: '400px' })
  io.observe(el)
})

// Swap Mapbox base style when the app theme toggles. The style reset
// wipes sources/layers, so we re-add the eclipse path once the new
// style finishes loading. Region-label markers are DOM elements, so
// they survive style changes automatically.
watch(() => colorMode.value, (mode) => {
  if (!map) return
  map.setStyle(mapboxStyleFor(mode))
  map.once('style.load', () => applyEclipsePath())
})

onUnmounted(() => {
  io?.disconnect()
  io = null
  map?.remove()
  map = null
})
</script>

<template>
  <ClientOnly class="my-8">
    <div v-if="mapError" class="w-full rounded border border-border-subtle/40 bg-surface-raised flex items-center justify-center text-ink-3 font-mono text-sm" style="height: 400px;">
      {{ mapError }}
    </div>
    <div
      v-else
      ref="mapContainer"
      class="w-full rounded border border-border-subtle/40"
      style="height: 400px;"
    />
    <template #fallback>
      <div class="w-full rounded border border-border-subtle/40 bg-surface-raised flex items-center justify-center text-ink-3 font-mono text-sm" style="height: 400px;">
        Loading map…
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
/* Region labels — halo via text-shadow in the opposite tone so the text
   stays readable whether placed on a dark sea or a pale land tile. */
:deep(.guide-map-label) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #e2e8f0;
  text-shadow:
    0 1px 4px rgba(0, 0, 0, 0.8),
    0 0 2px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  white-space: nowrap;
  letter-spacing: 0.04em;
}
html.light :deep(.guide-map-label) {
  color: #1a1628;
  text-shadow:
    0 1px 4px rgba(250, 245, 235, 0.95),
    0 0 2px rgba(250, 245, 235, 0.8);
}
</style>
