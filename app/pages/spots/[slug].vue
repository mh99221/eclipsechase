<script setup lang="ts">
import { formatDuration } from '~/utils/eclipse'

const route = useRoute()
const slug = route.params.slug as string

const { data, error } = await useFetch(`/api/spots/${slug}`)

if (error.value || !data.value?.spot) {
  throw createError({ statusCode: 404, message: 'Spot not found' })
}

const spot = computed(() => data.value!.spot)

useHead({
  title: () => `${spot.value.name} — EclipseChase.is`,
  meta: [
    { name: 'description', content: () => spot.value.description },
  ],
})

const regionLabels: Record<string, string> = {
  westfjords: 'Westfjords',
  snaefellsnes: 'Snæfellsnes',
  reykjanes: 'Reykjanes',
  reykjavik: 'Reykjavík',
  borgarfjordur: 'Borgarfjörður',
}

const coverageBadge: Record<string, { label: string; color: string }> = {
  good: { label: 'Good signal', color: 'text-green-400' },
  limited: { label: 'Limited signal', color: 'text-amber-400' },
  none: { label: 'No signal', color: 'text-red-400' },
}
</script>

<template>
  <div class="relative noise min-h-screen">
    <!-- Nav -->
    <nav class="flex items-center justify-between px-6 sm:px-10 py-5">
      <NuxtLink to="/" class="flex items-center gap-3 group">
        <svg class="w-7 h-7" viewBox="0 0 128 128" fill="none">
          <circle cx="64" cy="64" r="36" fill="#050810" />
          <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
          <circle cx="96" cy="48" r="4" fill="#f59e0b" />
        </svg>
        <span class="font-display font-semibold text-sm tracking-wide text-slate-400 group-hover:text-slate-200 transition-colors">
          ECLIPSECHASE
        </span>
      </NuxtLink>
      <NuxtLink to="/map" class="text-xs font-mono text-slate-400 hover:text-corona transition-colors tracking-wider">
        VIEW ON MAP
      </NuxtLink>
    </nav>

    <!-- Content -->
    <article class="section-container max-w-3xl py-8 sm:py-16">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-xs font-mono text-slate-500 mb-8">
        <NuxtLink to="/map" class="hover:text-slate-300 transition-colors">Map</NuxtLink>
        <span>/</span>
        <span class="text-slate-400">{{ spot.name }}</span>
      </div>

      <!-- Header -->
      <div class="mb-10">
        <span class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase">
          {{ regionLabels[spot.region] || spot.region }}
        </span>
        <h1 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
          {{ spot.name }}
        </h1>
        <p class="text-base text-slate-300 leading-relaxed max-w-2xl">
          {{ spot.description }}
        </p>
      </div>

      <!-- Key stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <div class="bg-void-surface border border-void-border/40 px-4 py-4 rounded">
          <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Totality</p>
          <p class="font-display text-2xl font-bold text-white">
            {{ formatDuration(spot.totality_duration_seconds) }}
          </p>
        </div>
        <div class="bg-void-surface border border-void-border/40 px-4 py-4 rounded">
          <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Sun altitude</p>
          <p class="font-display text-2xl font-bold text-white">
            {{ spot.sun_altitude }}°
          </p>
        </div>
        <div class="bg-void-surface border border-void-border/40 px-4 py-4 rounded">
          <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Services</p>
          <p class="font-display text-lg font-semibold" :class="spot.has_services ? 'text-green-400' : 'text-slate-500'">
            {{ spot.has_services ? 'Available' : 'None nearby' }}
          </p>
        </div>
        <div class="bg-void-surface border border-void-border/40 px-4 py-4 rounded">
          <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Cell coverage</p>
          <p class="font-display text-lg font-semibold" :class="coverageBadge[spot.cell_coverage]?.color || 'text-slate-400'">
            {{ coverageBadge[spot.cell_coverage]?.label || spot.cell_coverage }}
          </p>
        </div>
      </div>

      <!-- Details -->
      <div class="space-y-8">
        <section v-if="spot.parking_info">
          <h2 class="font-display text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h.01M12 7h.01M16 7h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Parking
          </h2>
          <p class="text-slate-300 text-base leading-relaxed">{{ spot.parking_info }}</p>
        </section>

        <section v-if="spot.terrain_notes">
          <h2 class="font-display text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
            Terrain
          </h2>
          <p class="text-slate-300 text-base leading-relaxed">{{ spot.terrain_notes }}</p>
        </section>

        <!-- Coordinates -->
        <section>
          <h2 class="font-display text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Location
          </h2>
          <p class="font-mono text-sm text-slate-400">
            {{ spot.lat.toFixed(4) }}°N, {{ Math.abs(spot.lng).toFixed(4) }}°W
          </p>
          <a
            :href="`https://www.google.com/maps?q=${spot.lat},${spot.lng}`"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 mt-2 text-sm text-corona hover:text-corona-bright transition-colors"
          >
            Open in Google Maps
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </section>
      </div>
    </article>

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container text-center">
        <NuxtLink to="/map" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to map
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
