<script setup lang="ts">
import type { PhotoLicense } from '~/types/spots'

const props = withDefaults(defineProps<{
  credit: string
  creditUrl?: string
  license: PhotoLicense
  variant?: 'overlay' | 'inline'
}>(), {
  variant: 'overlay',
})

const licenseLabels: Record<PhotoLicense, string> = {
  unsplash: 'Unsplash License',
  pixabay: 'Pixabay License',
  'cc-by': 'CC BY 4.0',
  'cc-by-sa': 'CC BY-SA 4.0',
  cc0: 'Public Domain (CC0)',
  'nasa-pd': 'NASA Public Domain',
}
</script>

<template>
  <div
    class="flex items-center gap-1.5 text-xs font-mono"
    :class="[
      variant === 'overlay'
        ? 'absolute bottom-2 right-2 bg-void-deep/80 backdrop-blur-sm px-2.5 py-1.5 rounded'
        : '',
      'text-slate-500',
    ]"
    :title="licenseLabels[license]"
  >
    <!-- Camera icon (SVG) -->
    <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 5.5a1 1 0 011-1h1.586a1 1 0 00.707-.293L6.5 3h3l1.207 1.207a1 1 0 00.707.293H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V5.5z" />
      <circle cx="8" cy="8.5" r="2.25" />
    </svg>
    <component
      :is="creditUrl ? 'a' : 'span'"
      v-bind="creditUrl ? { href: creditUrl, target: '_blank', rel: 'noopener noreferrer' } : {}"
      class="hover:text-slate-300 transition-colors truncate"
    >
      {{ credit }}
    </component>
  </div>
</template>
