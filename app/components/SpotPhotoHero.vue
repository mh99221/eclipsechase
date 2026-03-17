<script setup lang="ts">
import type { SpotPhoto } from '~/types/spots'

const props = withDefaults(defineProps<{
  photo: SpotPhoto
  spotName: string
  loading?: 'lazy' | 'eager'
}>(), {
  loading: 'eager',
})

const fullSrc = computed(() => `/images/spots/${props.photo.filename}`)
const thumbSrc = computed(() => {
  const base = props.photo.filename.replace(/\.webp$/, '')
  return `/images/spots/${base}-thumb.webp`
})
</script>

<template>
  <div class="relative overflow-hidden rounded-lg border border-void-border/40">
    <img
      :src="fullSrc"
      :srcset="`${thumbSrc} 600w, ${fullSrc} 1200w`"
      sizes="(max-width: 639px) 600px, 1200px"
      :alt="photo.alt"
      :loading="loading"
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
</template>
