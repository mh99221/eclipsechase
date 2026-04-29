<script setup lang="ts">
import type { Region } from '~/types/spots'
import { readCssVar } from '~/utils/theme'

const config = useRuntimeConfig()
const colorMode = useColorMode()
const mapContainer = ref<HTMLElement | null>(null)
const mapError = ref('')
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

watch(mapContainer, async (el) => {
  if (!el || map) return

  const token = config.public.mapboxToken as string
  if (!token) {
    mapError.value = 'No Mapbox token configured'
    return
  }

  try {
    const mapboxgl = (await import('mapbox-gl')).default
    const { regionLabel } = await import('~/utils/eclipse')

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
        el.textContent = regionLabel(region.key)

        new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([region.lng, region.lat])
          .addTo(map!)
      }
    })

    map.on('error', (e: any) => {
      console.error('[GuidePathMap] Mapbox error:', e)
      mapError.value = 'Map failed to load'
    })
  } catch (err: any) {
    console.error('[GuidePathMap]', err)
    mapError.value = err.message || 'Map failed to load'
  }
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
