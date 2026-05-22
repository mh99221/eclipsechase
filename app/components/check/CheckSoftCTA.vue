<script setup lang="ts">
/**
 * Two non-aggressive next-step cards under /check results. No paywall
 * language — purely additive.
 */
defineProps<{
  insidePath: boolean
}>()
</script>

<template>
  <section class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <NuxtLink
      to="/spots"
      class="block bg-surface border border-border-subtle/40 rounded p-4 hover:border-accent/40 transition-colors"
    >
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-accent/80 mb-2">
        Curated spots
      </p>
      <p class="text-ink-1 font-semibold mb-1">See 30 viewing spots →</p>
      <p class="text-sm text-ink-3">
        Hand-picked locations with verified clear horizons and historical
        weather, ranked by score.
      </p>
    </NuxtLink>
    <NuxtLink
      to="/pro"
      class="block bg-surface border border-border-subtle/40 rounded p-4 hover:border-accent/40 transition-colors"
    >
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-accent/80 mb-2">
        Eclipse Pro
      </p>
      <p class="text-ink-1 font-semibold mb-1">Tap-anywhere checks →</p>
      <p class="text-sm text-ink-3">
        Live cloud forecast, road conditions, road cameras, offline maps.
      </p>
    </NuxtLink>
  </section>
</template>
