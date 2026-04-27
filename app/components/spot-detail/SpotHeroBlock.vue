<script setup lang="ts">
import type { SpotPhoto } from '~/types/spots'

defineProps<{
  name: string
  region: string
  hero: SpotPhoto | null
  kicker?: string
}>()
</script>

<template>
  <header class="spot-hero">
    <div class="spot-hero-photo">
      <img
        v-if="hero"
        :src="`/images/spots/${hero.filename}`"
        :alt="hero.alt"
        loading="eager"
      />
      <div v-else class="spot-hero-fallback" aria-hidden="true" />
      <div class="spot-hero-veil" aria-hidden="true" />
    </div>
    <div class="spot-hero-meta">
      <div class="spot-hero-kicker">{{ kicker ?? '● SPOT' }}</div>
      <h1 class="spot-hero-name">{{ name }}</h1>
      <div class="spot-hero-region">{{ region }}</div>
    </div>
  </header>
</template>

<style scoped>
.spot-hero { position: relative; }
.spot-hero-photo {
  position: relative;
  height: 220px;
  overflow: hidden;
  background: linear-gradient(180deg, #2a1f15 0%, #0f1018 100%);
}
@media (min-width: 640px) {
  /* Match the page content gutter on desktop and round to the same
     12px radius as the Cards below. Mobile stays full-bleed per v0. */
  .spot-hero-photo {
    height: 320px;
    margin: 0 24px;
    border-radius: 12px;
  }
}
@media (min-width: 1024px) {
  .spot-hero-photo { height: 400px; }
}
.spot-hero-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.spot-hero-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #2a1f15 0%, #0f1018 100%);
}
.spot-hero-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 30%, rgba(7,10,18,0.92) 100%);
}
.spot-hero-meta { padding: 20px 16px 8px; }
.spot-hero-kicker {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: rgb(var(--accent));
  letter-spacing: 0.2em;
  margin-bottom: 8px;
  text-transform: uppercase;
}
.spot-hero-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  letter-spacing: -0.018em;
  line-height: 1.1;
  margin: 0;
}
.spot-hero-region {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 6px;
}

/* Desktop scale-up — placed after the base rules so cascade wins. */
@media (min-width: 768px) {
  .spot-hero-meta { padding: 28px 24px 12px; }
  .spot-hero-name { font-size: 36px; }
  .spot-hero-region { font-size: 14px; margin-top: 8px; }
}
@media (min-width: 1024px) {
  .spot-hero-name { font-size: 44px; letter-spacing: -0.02em; }
}
</style>
