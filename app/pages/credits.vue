<script setup lang="ts">
import type { SpotPhoto } from '~/types/spots'

useHead({
  title: 'Photo Credits',
  meta: [
    { name: 'description', content: 'Photo credits and attribution for images used on EclipseChase.is.' },
  ],
})

const { locale } = useI18n()
const { data } = await useFetch('/api/spots', {
  query: { locale: locale.value },
  key: `credits-spots-${locale.value}`,
})

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
}

const licenseBadgeColor: Record<string, string> = {
  unsplash: 'text-ink-3 border-border-subtle',
}
</script>

<template>
  <PageShell screen="credits" width="reading">
    <article class="legal-body">
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-ink-1 mb-2">
        Photo Credits
      </h1>
      <Eyebrow tone="dim" class="mb-10">Attribution for all photographs used on EclipseChase.is.</Eyebrow>

      <div class="space-y-10">
        <p v-if="spots.length === 0" class="text-ink-2 text-base">
          No photo credits to display yet. Photos will be added as viewing spots are populated.
        </p>

        <section v-for="spot in spots" :key="spot.slug">
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-4">
            {{ spot.name }}
          </h2>
          <div class="space-y-3">
            <div
              v-for="photo in spot.photos"
              :key="photo.filename"
              class="flex items-start gap-4 bg-surface-raised border border-border-subtle/60 rounded-lg p-4"
            >
              <!-- Thumbnail -->
              <img
                :src="`/images/spots/${photo.filename.replace(/\.webp$/, '-thumb.webp')}`"
                :alt="photo.alt"
                loading="lazy"
                width="120"
                height="68"
                class="w-[120px] h-[68px] rounded object-cover flex-shrink-0 border border-border-subtle/60"
              />
              <!-- Details -->
              <div class="min-w-0 flex-1">
                <p class="text-sm text-ink-2 mb-1">{{ photo.alt }}</p>
                <div class="flex items-center gap-2 flex-wrap">
                  <component
                    :is="photo.credit_url ? 'a' : 'span'"
                    v-bind="photo.credit_url ? { href: photo.credit_url, target: '_blank', rel: 'noopener noreferrer' } : {}"
                    class="text-xs font-mono text-ink-3 hover:text-ink-1 transition-colors"
                  >
                    {{ photo.credit }}
                  </component>
                  <span
                    class="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border"
                    :class="licenseBadgeColor[photo.license] || 'text-ink-3 border-border-subtle'"
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
      <div class="mt-16 pt-8 border-t border-border-subtle/60">
        <h2 class="font-display text-lg font-semibold text-ink-1 mb-4">License Information</h2>
        <div class="space-y-3 text-sm text-ink-3">
          <p>
            <strong class="text-ink-2">© All rights reserved (Martin Herchl / EclipseChase.is)</strong> --
            Original photographs by Martin Herchl. Reuse, redistribution, or modification is not permitted without prior written permission.
          </p>
          <p>
            <strong class="text-ink-2">Shutterstock (Standard License)</strong> --
            Licensed from Shutterstock for use on this website. The license permits use in digital and printed media but does not transfer ownership; redistribution or resale of the images is not permitted. See shutterstock.com/license for full terms.
          </p>
          <p>
            <strong class="text-ink-2">Unsplash License</strong> --
            Free to use for commercial and non-commercial purposes. No permission needed; attribution to the photographer is appreciated but not required. See unsplash.com/license for full terms.
          </p>
        </div>
      </div>
    </article>

    <AppFooter />
  </PageShell>
</template>

<style scoped>
.legal-body {
  padding: 32px 16px 16px;
}
@media (min-width: 768px) {
  .legal-body {
    padding: 64px 24px 32px;
  }
}
</style>

