<script setup lang="ts">
import { formatDuration, REGION_LABELS, SPOT_TYPE_LABELS } from '~/utils/eclipse'
import type { SpotPhoto } from '~/types/spots'

const { data } = await useFetch('/api/spots')

const spots = computed(() => {
  const list = data.value?.spots || []
  return [...list].sort((a: any, b: any) => (b.totality_duration_seconds || 0) - (a.totality_duration_seconds || 0))
})

function getHeroUrl(spot: any): string {
  const raw = spot.photos
  if (raw) {
    const photos = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : []
    const hero = photos.find((p: SpotPhoto) => p.is_hero) || photos[0]
    if (hero) return `/images/spots/${hero.filename}`
  }
  return `/images/spots/${spot.slug}-hero.webp`
}

function getThumbUrl(spot: any): string {
  return getHeroUrl(spot).replace(/\.webp$/, '-thumb.webp')
}

function getHorizonVerdict(spot: any): string | null {
  const raw = spot.horizon_check
  if (!raw) return null
  const hc = typeof raw === 'string' ? JSON.parse(raw) : raw
  return hc?.verdict || null
}

const verdictColor: Record<string, string> = {
  clear: 'text-green-400 border-green-400/30 bg-green-400/10',
  marginal: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  risky: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  blocked: 'text-red-400 border-red-400/30 bg-red-400/10',
}

useHead({
  title: 'Viewing Spots — EclipseChase',
  meta: [
    { name: 'description', content: 'Browse 28 curated eclipse viewing spots across western Iceland for the August 12, 2026 total solar eclipse.' },
  ],
})
</script>

<template>
  <div class="relative noise min-h-screen pt-[72px]">
    <div class="section-container max-w-5xl py-8 sm:py-12">
      <p class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase mb-3">Eclipse 2026</p>
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-white mb-8">Viewing Spots</h1>

      <!-- Spot grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink
          v-for="spot in spots"
          :key="spot.id"
          :to="`/spots/${spot.slug}`"
          class="group bg-void-surface border border-void-border/40 rounded overflow-hidden hover:border-corona/30 transition-colors"
        >
          <div class="aspect-video bg-void-deep overflow-hidden">
            <img
              :src="getThumbUrl(spot)"
              :srcset="`${getThumbUrl(spot)} 600w, ${getHeroUrl(spot)} 1200w`"
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              :alt="spot.name"
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div class="px-4 py-3">
            <div class="flex items-center gap-2 mb-1.5">
              <span
                v-if="spot.spot_type"
                class="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
                :class="spot.spot_type === 'drive-up' ? 'text-green-400 border-green-400/30' : 'text-amber-400 border-amber-400/30'"
              >{{ SPOT_TYPE_LABELS[spot.spot_type] || spot.spot_type }}</span>
              <span
                v-if="getHorizonVerdict(spot)"
                class="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
                :class="verdictColor[getHorizonVerdict(spot)!]"
              >{{ getHorizonVerdict(spot) }}</span>
            </div>
            <h3 class="font-display text-base font-semibold text-white mb-1 group-hover:text-corona-bright transition-colors">{{ spot.name }}</h3>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] text-slate-500 uppercase tracking-wider">{{ REGION_LABELS[spot.region] || spot.region }}</span>
              <span class="font-display text-sm font-bold text-white">{{ formatDuration(spot.totality_duration_seconds) }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container text-center">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to home
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
