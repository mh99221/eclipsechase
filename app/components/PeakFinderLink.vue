<script setup lang="ts">
const props = defineProps<{
  lat: number
  lng: number
  elevation: number
  sunAzimuth: number
  spotName: string
}>()

const { t } = useI18n()

const url = computed(() =>
  `https://www.peakfinder.com/?lat=${props.lat}&lng=${props.lng}&name=${encodeURIComponent(props.spotName)}&ele=${Math.round(props.elevation)}&azi=${Math.round(props.sunAzimuth)}&date=2026-08-12T17:40:22Z`,
)
</script>

<template>
  <div>
    <a
      :href="url"
      target="_blank"
      rel="noopener"
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-void-border/40 bg-void-surface text-sm text-slate-300 hover:text-white hover:border-corona/40 transition-colors"
    >
      <svg class="w-4 h-4 text-corona/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {{ t('horizon.peakfinder_link') }}
      <svg class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
    <p class="mt-1.5 text-[10px] font-mono text-slate-500">
      {{ t('horizon.peakfinder_subtitle') }}
    </p>
  </div>
</template>
