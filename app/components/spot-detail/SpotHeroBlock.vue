<script setup lang="ts">
import type { SpotPhoto } from '~/types/spots'

const props = defineProps<{
  name: string
  region: string
  hero: SpotPhoto | null
  kicker?: string
  /** Optional GPS coordinates rendered below the region line. */
  lat?: number
  lng?: number
}>()

// Mobile (<640) is full-bleed → ~100vw. Tablet/desktop is the
// PageShell-reading inner (≤768) minus 24px side margins → ~720px.
const heroSrcset = computed(() => {
  if (!props.hero) return undefined
  const thumb = props.hero.filename.replace(/\.webp$/, '-thumb.webp')
  return `/images/spots/${thumb} 600w, /images/spots/${props.hero.filename} 1200w`
})

// Format like "63.8121° N · 22.7068° W". Iceland is always N+/W-.
// 4 decimals ≈ 11 m precision — plenty for a copy-paste-into-Maps readout.
const formattedCoordinates = computed(() => {
  if (props.lat == null || props.lng == null) return null
  const ns = props.lat >= 0 ? 'N' : 'S'
  const ew = props.lng >= 0 ? 'E' : 'W'
  return `${Math.abs(props.lat).toFixed(4)}° ${ns} · ${Math.abs(props.lng).toFixed(4)}° ${ew}`
})
</script>

<template>
  <header class="spot-hero">
    <div class="spot-hero-photo">
      <img
        v-if="hero"
        :src="`/images/spots/${hero.filename}`"
        :srcset="heroSrcset"
        sizes="(max-width: 639px) 100vw, 720px"
        :alt="hero.alt"
        loading="eager"
        width="1200"
        height="800"
      />
      <div v-else class="spot-hero-fallback" aria-hidden="true" />
      <div class="spot-hero-veil" aria-hidden="true" />
    </div>
    <div class="spot-hero-meta">
      <!-- Kicker row — flex container so consumers can mount trailing
           controls (e.g. the AdvisoriesBadge) on the right via the
           `meta-end` slot without restructuring the hero. -->
      <div class="spot-hero-kicker-row">
        <span class="spot-hero-kicker">{{ kicker ?? '● SPOT' }}</span>
        <slot name="meta-end" />
      </div>
      <h1 class="spot-hero-name">{{ name }}</h1>
      <div v-if="formattedCoordinates" class="spot-hero-coords">{{ formattedCoordinates }}</div>
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
  /* Photo veil — stays dark in both themes since it's sitting over a
     dark hero photo, not over the page bg. Per LIGHT_THEME_SPEC §1. */
  background: linear-gradient(180deg, transparent 30%, rgb(var(--glass-strong) / 0.92) 100%);
}
.spot-hero-meta { padding: 20px 16px 8px; }
.spot-hero-kicker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  min-height: 20px;          /* keeps height stable when no slot content */
}
.spot-hero-kicker {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: rgb(var(--accent));
  letter-spacing: 0.2em;
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
.spot-hero-coords {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgb(var(--ink-3));
  margin-top: 6px;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
.spot-hero-region {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 4px;
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
