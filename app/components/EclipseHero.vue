<script setup lang="ts">
// Concentric instrument rings — rotating via CSS animations
const isVisible = ref(false)

onMounted(() => {
  isVisible.value = true
})

// Ring definitions: radius, speed (deg/s), direction, dash pattern, opacity, width
const rings = [
  { r: 140, speed: 0.8, dir: 1, dash: '1 12', opacity: 0.12, width: 0.5 },
  { r: 130, speed: 1.2, dir: -1, dash: '3 8', opacity: 0.15, width: 0.5 },
  { r: 118, speed: 0.5, dir: 1, dash: '8 16', opacity: 0.1, width: 0.8 },
  { r: 105, speed: 2.0, dir: -1, dash: '1 6', opacity: 0.08, width: 0.3 },
  { r: 95, speed: 0.3, dir: 1, dash: '20 10 2 10', opacity: 0.18, width: 1 },
  { r: 82, speed: 1.5, dir: -1, dash: '2 4', opacity: 0.12, width: 0.5 },
]

// Pre-compute static tick mark positions
const DEG_TO_RAD = Math.PI / 180
const ticks = Array.from({ length: 36 }, (_, i) => {
  const idx = i + 1
  const angle = idx * 10 * DEG_TO_RAD
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const isMajor = idx % 9 === 0
  return {
    x1: 160 + 148 * cos,
    y1: 160 + 148 * sin,
    x2: 160 + (isMajor ? 156 : 152) * cos,
    y2: 160 + (isMajor ? 156 : 152) * sin,
    strokeWidth: isMajor ? '0.8' : '0.3',
  }
})
</script>

<template>
  <div
    class="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80"
    :class="{ 'opacity-0': !isVisible, 'opacity-100 transition-opacity duration-[2000ms]': isVisible }"
  >
    <svg
      class="relative w-full h-full"
      viewBox="0 0 320 320"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <!-- Soft ambient glow -->
        <radialGradient id="ring-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.3" stop-color="#f59e0b" stop-opacity="0" />
          <stop offset="0.5" stop-color="#f59e0b" stop-opacity="0.04" />
          <stop offset="0.7" stop-color="#f59e0b" stop-opacity="0.02" />
          <stop offset="1" stop-color="#f59e0b" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Ambient glow -->
      <circle cx="160" cy="160" r="155" fill="url(#ring-glow)" />

      <!-- Rotating concentric rings — CSS-driven -->
      <circle
        v-for="(ring, i) in rings" :key="'ring-' + i"
        cx="160" cy="160"
        :r="ring.r"
        fill="none"
        stroke="#f59e0b"
        :stroke-width="ring.width"
        :stroke-dasharray="ring.dash"
        :opacity="ring.opacity"
        class="ring-rotate"
        :style="{
          transformOrigin: '160px 160px',
          animationDuration: `${360 / ring.speed}s`,
          animationDirection: ring.dir === -1 ? 'reverse' : 'normal',
        }"
      />

      <!-- Static fine crosshair lines — reticle aesthetic -->
      <g opacity="0.06">
        <line x1="160" y1="20" x2="160" y2="68" stroke="#f59e0b" stroke-width="0.5" />
        <line x1="160" y1="252" x2="160" y2="300" stroke="#f59e0b" stroke-width="0.5" />
        <line x1="20" y1="160" x2="68" y2="160" stroke="#f59e0b" stroke-width="0.5" />
        <line x1="252" y1="160" x2="300" y2="160" stroke="#f59e0b" stroke-width="0.5" />
      </g>

      <!-- Corona flares — rays bursting outward from the pulsating ring edge -->
      <g class="animate-corona-pulse">
        <line x1="160" y1="92" x2="160" y2="46" stroke="#f59e0b" stroke-width="1.2" opacity="0.2" />
        <line x1="208" y1="112" x2="248" y2="78" stroke="#fbbf24" stroke-width="0.8" opacity="0.15" />
        <line x1="228" y1="160" x2="274" y2="160" stroke="#f59e0b" stroke-width="1" opacity="0.18" />
        <line x1="200" y1="216" x2="232" y2="252" stroke="#fbbf24" stroke-width="0.6" opacity="0.12" />
        <line x1="160" y1="228" x2="160" y2="270" stroke="#f59e0b" stroke-width="0.8" opacity="0.14" />
        <line x1="108" y1="208" x2="72" y2="232" stroke="#fbbf24" stroke-width="1" opacity="0.16" />
        <line x1="93" y1="148" x2="52" y2="140" stroke="#f59e0b" stroke-width="0.7" opacity="0.13" />
        <line x1="118" y1="108" x2="96" y2="68" stroke="#fbbf24" stroke-width="0.9" opacity="0.15" />
      </g>

      <!-- Pulsating corona ring -->
      <circle
        cx="160" cy="160" r="68"
        fill="none"
        stroke="#f59e0b"
        stroke-width="5"
        opacity="0.4"
        class="animate-corona-pulse"
      />

      <!-- Outer measurement tick marks (pre-computed) -->
      <g opacity="0.15">
        <line v-for="(tick, i) in ticks" :key="'tick-' + i"
          :x1="tick.x1" :y1="tick.y1"
          :x2="tick.x2" :y2="tick.y2"
          stroke="#f59e0b"
          :stroke-width="tick.strokeWidth"
        />
      </g>

      <!-- Small degree labels at cardinal points -->
      <g font-size="5" fill="#f59e0b" opacity="0.12" text-anchor="middle" font-family="monospace">
        <text x="160" y="14">0°</text>
        <text x="306" y="163">90°</text>
        <text x="160" y="312">180°</text>
        <text x="17" y="163">270°</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.ring-rotate {
  animation: ring-spin linear infinite;
}

@keyframes ring-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
