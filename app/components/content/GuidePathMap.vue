<script setup lang="ts">
const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
const mapError = ref('')
let map: any = null

watch(mapContainer, async (el) => {
  if (!el || map) return

  const token = config.public.mapboxToken as string
  if (!token) {
    mapError.value = 'No Mapbox token configured'
    return
  }

  try {
    const mapboxgl = (await import('mapbox-gl')).default
    const { addEclipsePathLayers } = await import('~/utils/mapLayers')
    const { REGION_LABELS } = await import('~/utils/eclipse')

    mapboxgl.accessToken = token

    map = new mapboxgl.Map({
      container: el,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-22.5, 65.0],
      zoom: 5.5,
      interactive: false,
      attributionControl: false,
    })

    map.on('load', () => {
      if (!map) return

      addEclipsePathLayers(map, { borderWidth: 1, centerlineOpacity: 0.8 })

      const REGION_MARKERS = [
        { key: 'westfjords', lng: -22.8, lat: 65.8 },
        { key: 'snaefellsnes', lng: -23.5, lat: 64.85 },
        { key: 'borgarfjordur', lng: -21.5, lat: 64.7 },
        { key: 'reykjanes', lng: -22.2, lat: 63.95 },
      ]

      for (const region of REGION_MARKERS) {
        const el = document.createElement('div')
        el.className = 'guide-map-label'
        el.textContent = REGION_LABELS[region.key] || region.key

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

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <ClientOnly class="my-8">
    <div v-if="mapError" class="w-full rounded border border-border-subtle bg-surface flex items-center justify-center text-ink-3 font-mono text-sm" style="height: 400px;">
      {{ mapError }}
    </div>
    <div
      v-else
      ref="mapContainer"
      class="w-full rounded border border-border-subtle"
      style="height: 400px;"
    />
    <template #fallback>
      <div class="w-full rounded border border-border-subtle bg-surface flex items-center justify-center text-ink-3 font-mono text-sm" style="height: 400px;">
        Loading map…
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
:deep(.guide-map-label) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #94a3b8;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  white-space: nowrap;
  letter-spacing: 0.04em;
}
</style>
