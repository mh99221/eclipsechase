<script setup lang="ts">
import type { SpotPhoto } from '~/types/spots'

const props = defineProps<{
  photos: SpotPhoto[]
  spotName: string
}>()

const heroPhoto = computed(() => props.photos.find(p => p.is_hero) || props.photos[0])
const otherPhotos = computed(() => props.photos.filter(p => p !== heroPhoto.value))
</script>

<template>
  <div v-if="photos.length > 0" class="mb-10">
    <!-- Single photo -->
    <template v-if="photos.length === 1">
      <SpotPhotoHero :photo="heroPhoto" :spot-name="spotName" loading="eager" />
    </template>

    <!-- Two photos: side by side on desktop, stacked on mobile -->
    <template v-else-if="photos.length === 2">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <SpotPhotoHero :photo="heroPhoto" :spot-name="spotName" loading="eager" />
        <div class="relative overflow-hidden rounded-lg border border-border-subtle/40">
          <img
            :src="`/images/spots/${otherPhotos[0].filename}`"
            :srcset="`/images/spots/${otherPhotos[0].filename.replace(/\.webp$/, '-thumb.webp')} 600w, /images/spots/${otherPhotos[0].filename} 1200w`"
            sizes="(max-width: 639px) 600px, 600px"
            :alt="otherPhotos[0].alt"
            loading="lazy"
            width="1200"
            height="675"
            class="w-full aspect-video object-cover"
          />
          <PhotoCredit
            :credit="otherPhotos[0].credit"
            :credit-url="otherPhotos[0].credit_url"
            :license="otherPhotos[0].license"
            variant="overlay"
          />
        </div>
      </div>
    </template>

    <!-- Three photos: hero on top, two smaller below -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div class="md:col-span-2">
          <SpotPhotoHero :photo="heroPhoto" :spot-name="spotName" loading="eager" />
        </div>
        <div
          v-for="photo in otherPhotos.slice(0, 2)"
          :key="photo.filename"
          class="relative overflow-hidden rounded-lg border border-border-subtle/40"
        >
          <img
            :src="`/images/spots/${photo.filename}`"
            :srcset="`/images/spots/${photo.filename.replace(/\.webp$/, '-thumb.webp')} 600w, /images/spots/${photo.filename} 1200w`"
            sizes="(max-width: 639px) 600px, 600px"
            :alt="photo.alt"
            loading="lazy"
            width="1200"
            height="675"
            class="w-full aspect-video object-cover"
          />
          <PhotoCredit
            :credit="photo.credit"
            :credit-url="photo.credit_url"
            :license="photo.license"
            variant="overlay"
          />
        </div>
      </div>
    </template>
  </div>
</template>
