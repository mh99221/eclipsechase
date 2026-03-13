<script setup lang="ts">
// Generate deterministic stars using a seed
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

interface Star {
  x: number
  y: number
  size: number
  opacity: number
  delay: number
  duration: number
}

const stars: Star[] = []
for (let i = 0; i < 120; i++) {
  stars.push({
    x: seededRandom(i * 7 + 1) * 100,
    y: seededRandom(i * 13 + 3) * 100,
    size: seededRandom(i * 11 + 5) * 1.8 + 0.4,
    opacity: seededRandom(i * 17 + 7) * 0.4 + 0.05,
    delay: seededRandom(i * 23 + 11) * 8,
    duration: seededRandom(i * 29 + 13) * 5 + 4,
  })
}
</script>

<template>
  <div class="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <div
      v-for="(star, i) in stars"
      :key="i"
      class="absolute rounded-full"
      :style="{
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: `${star.size}px`,
        height: `${star.size}px`,
        backgroundColor: star.size > 1.5 ? '#e8dcc8' : '#ffffff',
        opacity: star.opacity,
        animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
      }"
    />
  </div>
</template>

<style scoped>
@keyframes twinkle {
  0%, 100% { opacity: 0.05; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.3); }
}
</style>
