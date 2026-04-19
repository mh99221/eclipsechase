<script setup lang="ts">
import type { HorizonCheckResponse, HorizonProfileData } from '~/types/horizon'

const props = defineProps<{
  lat: number
  lng: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'result', data: HorizonCheckResponse): void
}>()

const { t } = useI18n()

const loading = ref(true)
const error = ref<string | null>(null)
const result = ref<HorizonCheckResponse | null>(null)

const profileData = computed<HorizonProfileData | null>(() => {
  const r = result.value
  if (!r?.sweep?.length) return null
  return {
    sun_azimuth: r.sun_azimuth,
    sun_altitude: r.sun_altitude,
    sweep: r.sweep,
    verdict: r.verdict,
    clearance_degrees: r.clearance_degrees,
  }
})

const navigateUrl = computed(() =>
  `https://www.google.com/maps/dir/?api=1&destination=${props.lat},${props.lng}`,
)

onMounted(async () => {
  try {
    const data = await $fetch<HorizonCheckResponse>('/api/horizon/check', {
      method: 'POST',
      body: { lat: props.lat, lng: props.lng },
    })
    result.value = data
    emit('result', data)
  } catch (e: any) {
    if (e?.statusCode === 401 || e?.statusCode === 403) {
      error.value = 'pro_required'
    } else if (e?.statusCode === 422) {
      error.value = 'outside_coverage'
    } else {
      error.value = e?.message || 'Failed to check horizon'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="bg-surface border border-border-subtle/40 rounded p-4 max-w-2xl w-full">
    <!-- Close button -->
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-display text-sm font-semibold text-ink-1">{{ t('horizon.section_title') }}</h3>
      <button class="text-ink-3 hover:text-ink-2 transition-colors" @click="emit('close')">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 text-sm text-ink-3 py-4">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {{ t('horizon.dynamic_loading') }}
    </div>

    <!-- Pro upgrade prompt -->
    <div v-else-if="error === 'pro_required'" class="text-center py-4">
      <p class="text-sm text-ink-3 mb-3">{{ t('horizon.upgrade_prompt') }}</p>
      <NuxtLink to="/pro" class="inline-block px-4 py-2 bg-accent/20 border border-accent/40 rounded text-sm text-accent hover:bg-accent/30 transition-colors">
        {{ t('horizon.upgrade_button', 'Upgrade to Pro') }}
      </NuxtLink>
    </div>

    <!-- Outside DEM coverage -->
    <div v-else-if="error === 'outside_coverage'" class="text-sm text-ink-3 py-2">
      {{ t('horizon.outside_coverage', 'This location is outside the terrain coverage area.') }}
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-sm text-status-red py-4">
      {{ error }}
    </div>

    <!-- Result -->
    <div v-else-if="result">
      <div v-if="!result.in_totality_path" class="text-sm text-ink-3 py-2">
        {{ t('horizon.outside_path', 'This location is outside the path of totality.') }}
      </div>
      <template v-else>
        <HorizonBadge :verdict="result.verdict" :clearance="result.clearance_degrees" class="mb-3" />

        <HorizonProfile v-if="profileData" :data="profileData" :lat="lat" :lng="lng" class="mb-3" />

        <div class="flex items-center gap-2 mt-3">
          <a
            :href="result.peakfinder_url"
            target="_blank"
            rel="noopener"
            class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded border border-border-subtle/40 text-xs font-mono text-ink-3 hover:text-ink-1 hover:border-accent/40 transition-colors"
          >
            <svg class="w-3.5 h-3.5 text-accent/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            PeakFinder
            <svg class="w-3 h-3 text-ink-3/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <a
            :href="navigateUrl"
            target="_blank"
            rel="noopener"
            class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded border border-border-subtle/40 text-xs font-mono text-ink-3 hover:text-ink-1 hover:border-accent/40 transition-colors"
          >
            <svg class="w-3.5 h-3.5 text-accent/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Navigate
            <svg class="w-3 h-3 text-ink-3/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </template>
    </div>
  </div>
</template>
