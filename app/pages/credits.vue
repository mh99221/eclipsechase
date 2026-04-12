<script setup lang="ts">
import type { SpotPhoto } from '~/types/spots'

useHead({
  title: 'Photo Credits',
  meta: [
    { name: 'description', content: 'Photo credits and attribution for images used on EclipseChase.is.' },
  ],
})

const { data } = await useFetch('/api/spots')

interface SpotWithPhotos {
  name: string
  slug: string
  photos: SpotPhoto[]
}

const spots = computed<SpotWithPhotos[]>(() => {
  if (!data.value?.spots) return []
  return (data.value.spots as SpotWithPhotos[]).filter(s => s.photos && s.photos.length > 0)
})

const licenseLabels: Record<string, string> = {
  unsplash: 'Unsplash License',
  pixabay: 'Pixabay License',
  'cc-by': 'CC BY 4.0',
  'cc-by-sa': 'CC BY-SA 4.0',
  cc0: 'Public Domain (CC0)',
  'nasa-pd': 'NASA Public Domain',
}

const licenseBadgeColor: Record<string, string> = {
  unsplash: 'text-slate-400 border-slate-600',
  pixabay: 'text-slate-400 border-slate-600',
  'cc-by': 'text-amber-400 border-amber-700/40',
  'cc-by-sa': 'text-amber-400 border-amber-700/40',
  cc0: 'text-green-400 border-green-700/40',
  'nasa-pd': 'text-blue-400 border-blue-700/40',
}
</script>

<template>
  <div class="relative noise min-h-screen pt-[72px]">
    <!-- Content -->
    <article class="section-container max-w-3xl py-12 sm:py-20">
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
        Photo Credits
      </h1>
      <p class="text-sm font-mono text-slate-500 mb-10">
        Attribution for all photographs used on EclipseChase.is.
      </p>

      <div class="space-y-10">
        <p v-if="spots.length === 0" class="text-slate-400 text-base">
          No photo credits to display yet. Photos will be added as viewing spots are populated.
        </p>

        <section v-for="spot in spots" :key="spot.slug">
          <h2 class="font-display text-xl font-semibold text-white mb-4">
            {{ spot.name }}
          </h2>
          <div class="space-y-3">
            <div
              v-for="photo in spot.photos"
              :key="photo.filename"
              class="flex items-start gap-4 bg-void-surface border border-void-border/40 rounded-lg p-4"
            >
              <!-- Thumbnail -->
              <img
                :src="`/images/spots/${photo.filename.replace(/\.webp$/, '-thumb.webp')}`"
                :alt="photo.alt"
                loading="lazy"
                width="120"
                height="68"
                class="w-[120px] h-[68px] rounded object-cover flex-shrink-0 border border-void-border/30"
              />
              <!-- Details -->
              <div class="min-w-0 flex-1">
                <p class="text-sm text-slate-300 mb-1">{{ photo.alt }}</p>
                <div class="flex items-center gap-2 flex-wrap">
                  <component
                    :is="photo.credit_url ? 'a' : 'span'"
                    v-bind="photo.credit_url ? { href: photo.credit_url, target: '_blank', rel: 'noopener noreferrer' } : {}"
                    class="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {{ photo.credit }}
                  </component>
                  <span
                    class="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border"
                    :class="licenseBadgeColor[photo.license] || 'text-slate-400 border-slate-600'"
                  >
                    {{ licenseLabels[photo.license] || photo.license }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- License explanations -->
      <div class="mt-16 pt-8 border-t border-void-border/30">
        <h2 class="font-display text-lg font-semibold text-white mb-4">License Information</h2>
        <div class="space-y-3 text-sm text-slate-400">
          <p>
            <strong class="text-slate-300">Unsplash License</strong> --
            Free to use for commercial and non-commercial purposes. No permission needed. Attribution appreciated but not required.
          </p>
          <p>
            <strong class="text-slate-300">CC BY 4.0</strong> --
            Free to share and adapt, with appropriate credit to the creator.
          </p>
          <p>
            <strong class="text-slate-300">CC BY-SA 4.0</strong> --
            Free to share and adapt with credit. Adaptations must be shared under the same license.
          </p>
          <p>
            <strong class="text-slate-300">CC0 / Public Domain</strong> --
            No rights reserved. Free to use without any conditions.
          </p>
          <p>
            <strong class="text-slate-300">NASA Public Domain</strong> --
            NASA imagery is generally not copyrighted. Credit to NASA is a courtesy.
          </p>
        </div>
      </div>
    </article>

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container text-center">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to home
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
