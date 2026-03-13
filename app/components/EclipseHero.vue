<script setup lang="ts">
// Animated eclipse — the moon drifts across creating the diamond ring effect
const moonOffset = ref(0)
const isVisible = ref(false)

// Pre-compute tick mark positions (static geometry)
const DEG_TO_RAD = Math.PI / 180
const ticks = Array.from({ length: 36 }, (_, i) => {
  const idx = i + 1
  const angle = idx * 10 * DEG_TO_RAD
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const isMajor = idx % 9 === 0
  return {
    x1: 160 + 136 * cos,
    y1: 160 + 136 * sin,
    x2: 160 + (isMajor ? 144 : 140) * cos,
    y2: 160 + (isMajor ? 144 : 140) * sin,
    strokeWidth: isMajor ? '1' : '0.5',
  }
})

onMounted(() => {
  isVisible.value = true
  // Slow orbital drift animation
  let frame: number
  let start: number | null = null
  const animate = (timestamp: number) => {
    if (!start) start = timestamp
    const elapsed = timestamp - start
    moonOffset.value = Math.sin(elapsed / 8000) * 3
    frame = requestAnimationFrame(animate)
  }
  frame = requestAnimationFrame(animate)
  onUnmounted(() => cancelAnimationFrame(frame))
})
</script>

<template>
  <div
    class="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80"
    :class="{ 'opacity-0': !isVisible, 'opacity-100 transition-opacity duration-[2000ms]': isVisible }"
  >
    <svg
      class="w-full h-full"
      viewBox="0 0 320 320"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <!-- Corona radial gradient -->
        <radialGradient id="corona-outer" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.35" stop-color="#f59e0b" stop-opacity="0" />
          <stop offset="0.45" stop-color="#f59e0b" stop-opacity="0.05" />
          <stop offset="0.55" stop-color="#f59e0b" stop-opacity="0.15" />
          <stop offset="0.7" stop-color="#f59e0b" stop-opacity="0.05" />
          <stop offset="1" stop-color="#f59e0b" stop-opacity="0" />
        </radialGradient>

        <!-- Inner corona ring gradient -->
        <radialGradient id="corona-inner" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.6" stop-color="#fbbf24" stop-opacity="0.8" />
          <stop offset="0.8" stop-color="#f59e0b" stop-opacity="0.4" />
          <stop offset="1" stop-color="#b45309" stop-opacity="0" />
        </radialGradient>

        <!-- Diamond ring point light -->
        <radialGradient id="diamond-point" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#fef3c7" stop-opacity="1" />
          <stop offset="0.3" stop-color="#fbbf24" stop-opacity="0.8" />
          <stop offset="0.6" stop-color="#f59e0b" stop-opacity="0.3" />
          <stop offset="1" stop-color="#f59e0b" stop-opacity="0" />
        </radialGradient>

        <!-- Clip path for corona streamers -->
        <clipPath id="eclipse-clip">
          <rect width="320" height="320" />
        </clipPath>
      </defs>

      <!-- Outer corona glow -->
      <circle
        cx="160" cy="160" r="155"
        fill="url(#corona-outer)"
        class="animate-corona-pulse"
      />

      <!-- Corona streamers (asymmetric rays) -->
      <g opacity="0.12" class="animate-corona-pulse">
        <line x1="160" y1="160" x2="160" y2="20" stroke="#f59e0b" stroke-width="0.5" />
        <line x1="160" y1="160" x2="280" y2="60" stroke="#f59e0b" stroke-width="0.4" />
        <line x1="160" y1="160" x2="300" y2="160" stroke="#f59e0b" stroke-width="0.5" />
        <line x1="160" y1="160" x2="280" y2="260" stroke="#f59e0b" stroke-width="0.3" />
        <line x1="160" y1="160" x2="160" y2="300" stroke="#f59e0b" stroke-width="0.4" />
        <line x1="160" y1="160" x2="40" y2="260" stroke="#f59e0b" stroke-width="0.5" />
        <line x1="160" y1="160" x2="20" y2="160" stroke="#f59e0b" stroke-width="0.3" />
        <line x1="160" y1="160" x2="40" y2="60" stroke="#f59e0b" stroke-width="0.4" />
        <!-- Additional asymmetric streamers -->
        <line x1="160" y1="160" x2="230" y2="30" stroke="#fbbf24" stroke-width="0.3" />
        <line x1="160" y1="160" x2="310" y2="120" stroke="#fbbf24" stroke-width="0.2" />
        <line x1="160" y1="160" x2="70" y2="300" stroke="#fbbf24" stroke-width="0.3" />
        <line x1="160" y1="160" x2="10" y2="200" stroke="#fbbf24" stroke-width="0.2" />
      </g>

      <!-- Inner corona ring -->
      <circle
        cx="160" cy="160" r="72"
        fill="none"
        stroke="url(#corona-inner)"
        stroke-width="8"
        class="animate-corona-pulse"
      />

      <!-- Thin bright corona edge -->
      <circle
        cx="160" cy="160" r="66"
        fill="none"
        stroke="#fbbf24"
        stroke-width="1.5"
        opacity="0.6"
      />

      <!-- The Sun (hidden behind moon but corona peeks out) -->
      <circle cx="160" cy="160" r="64" fill="#1a1000" opacity="0.3" />

      <!-- The Moon — slightly offset for diamond ring effect -->
      <circle
        :cx="160 + moonOffset"
        :cy="160 - moonOffset * 0.5"
        r="63"
        fill="#050810"
      />
      <!-- Moon surface subtle detail -->
      <circle
        :cx="148 + moonOffset"
        :cy="150 - moonOffset * 0.5"
        r="8"
        fill="#080c14"
        opacity="0.5"
      />
      <circle
        :cx="170 + moonOffset"
        :cy="172 - moonOffset * 0.5"
        r="5"
        fill="#080c14"
        opacity="0.4"
      />

      <!-- Diamond ring bright point — appears where corona peeks around moon -->
      <circle
        :cx="218 - moonOffset"
        :cy="130 + moonOffset * 0.5"
        r="6"
        fill="url(#diamond-point)"
        class="animate-diamond-flare"
      />
      <!-- Diamond ring flare rays -->
      <g :transform="`translate(${218 - moonOffset}, ${130 + moonOffset * 0.5})`" class="animate-diamond-flare">
        <line x1="0" y1="-14" x2="0" y2="14" stroke="#fef3c7" stroke-width="0.8" opacity="0.6" />
        <line x1="-14" y1="0" x2="14" y2="0" stroke="#fef3c7" stroke-width="0.8" opacity="0.6" />
        <line x1="-10" y1="-10" x2="10" y2="10" stroke="#fef3c7" stroke-width="0.5" opacity="0.3" />
        <line x1="10" y1="-10" x2="-10" y2="10" stroke="#fef3c7" stroke-width="0.5" opacity="0.3" />
      </g>

      <!-- Outer measurement ring — observatory aesthetic -->
      <circle
        cx="160" cy="160" r="140"
        fill="none"
        stroke="#1a2540"
        stroke-width="0.5"
        stroke-dasharray="2 8"
        opacity="0.5"
      />
      <!-- Tick marks around the ring (pre-computed positions) -->
      <g opacity="0.3">
        <line v-for="(tick, i) in ticks" :key="i"
          :x1="tick.x1" :y1="tick.y1"
          :x2="tick.x2" :y2="tick.y2"
          stroke="#1a2540"
          :stroke-width="tick.strokeWidth"
        />
      </g>
    </svg>
  </div>
</template>
