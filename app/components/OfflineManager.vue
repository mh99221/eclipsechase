<script setup lang="ts">
const props = defineProps<{
  map: any
}>()

const isDownloading = ref(false)
const progress = ref(0)
const totalTiles = ref(0)
const loadedTiles = ref(0)
const isDone = ref(false)
const isCancelled = ref(false)

// Western Iceland bounding box (eclipse path region)
const BOUNDS = { west: -24.5, east: -20.5, south: 63.5, north: 66.5 }
const ZOOM_MIN = 5
const ZOOM_MAX = 11

function lng2tile(lng: number, zoom: number) {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
}

function lat2tile(lat: number, zoom: number) {
  const rad = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom))
}

function tile2lng(x: number, zoom: number) {
  return (x / Math.pow(2, zoom)) * 360 - 180
}

function tile2lat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

function countTiles(): number {
  let count = 0
  for (let z = ZOOM_MIN; z <= ZOOM_MAX; z++) {
    const xMin = lng2tile(BOUNDS.west, z)
    const xMax = lng2tile(BOUNDS.east, z)
    const yMin = lat2tile(BOUNDS.north, z) // note: lat→tile is inverted
    const yMax = lat2tile(BOUNDS.south, z)
    count += (xMax - xMin + 1) * (yMax - yMin + 1)
  }
  return count
}

async function downloadTiles() {
  if (!props.map || isDownloading.value) return

  isDownloading.value = true
  isDone.value = false
  isCancelled.value = false
  loadedTiles.value = 0
  totalTiles.value = countTiles()
  progress.value = 0

  for (let z = ZOOM_MIN; z <= ZOOM_MAX; z++) {
    if (isCancelled.value) break

    const xMin = lng2tile(BOUNDS.west, z)
    const xMax = lng2tile(BOUNDS.east, z)
    const yMin = lat2tile(BOUNDS.north, z)
    const yMax = lat2tile(BOUNDS.south, z)

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        if (isCancelled.value) break

        // Pan map to tile center to trigger tile load via SW
        const lng = tile2lng(x + 0.5, z)
        const lat = tile2lat(y + 0.5, z)

        props.map.jumpTo({ center: [lng, lat], zoom: z })

        // Small delay to let tiles load
        await new Promise(r => setTimeout(r, 80))

        loadedTiles.value++
        progress.value = Math.round((loadedTiles.value / totalTiles.value) * 100)
      }
    }
  }

  // Restore default view
  props.map.flyTo({ center: [-22.5, 65.0], zoom: 5.5, duration: 1000 })

  if (!isCancelled.value) {
    isDone.value = true
  }
  isDownloading.value = false
}

function cancel() {
  isCancelled.value = true
}
</script>

<template>
  <div class="bg-void-surface border border-void-border/40 rounded px-4 py-3">
    <!-- Idle state -->
    <div v-if="!isDownloading && !isDone">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
        Offline Maps
      </p>
      <p class="text-sm text-slate-400 mb-3">
        Download map tiles for western Iceland so you can navigate without signal on eclipse day.
      </p>
      <button
        class="font-mono text-xs tracking-wider px-3 py-2 rounded border border-corona/40 text-corona bg-corona/5 hover:bg-corona/10 transition-colors"
        @click="downloadTiles"
      >
        Download (~{{ countTiles() }} tiles)
      </button>
    </div>

    <!-- Downloading -->
    <div v-else-if="isDownloading">
      <div class="flex items-center justify-between mb-2">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-corona/70">
          Downloading tiles...
        </p>
        <button
          class="font-mono text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          @click="cancel"
        >
          Cancel
        </button>
      </div>
      <!-- Progress bar -->
      <div class="w-full h-1.5 bg-void-deep rounded-full overflow-hidden mb-2">
        <div
          class="h-full bg-corona transition-all duration-200"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <p class="font-mono text-xs text-slate-500">
        {{ loadedTiles }} / {{ totalTiles }} tiles ({{ progress }}%)
      </p>
    </div>

    <!-- Done -->
    <div v-else-if="isDone">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p class="text-sm text-green-400 font-mono">
          Offline maps ready
        </p>
      </div>
      <p class="text-xs text-slate-500 font-mono mt-1">
        {{ loadedTiles }} tiles cached. Map will work without internet.
      </p>
    </div>
  </div>
</template>
