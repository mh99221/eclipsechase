<script setup lang="ts">
import type { HorizonCheckResponse, HorizonProfileData } from '~/types/horizon'

const props = defineProps<{
  lat: number
  lng: number
}>()

const emit = defineEmits<{
  close: []
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
  } catch (e: any) {
    if (e?.statusCode === 403) {
      error.value = 'pro_required'
    } else {
      error.value = e?.message || 'Failed to check horizon'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="bg-void-surface border border-void-border/40 rounded p-4 max-w-lg w-full">
    <!-- Close button -->
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-display text-sm font-semibold text-white">{{ t('horizon.section_title') }}</h3>
      <button class="text-slate-500 hover:text-slate-300 transition-colors" @click="emit('close')">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 text-sm text-slate-400 py-4">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {{ t('horizon.dynamic_loading') }}
    </div>

    <!-- Pro upgrade prompt -->
    <div v-else-if="error === 'pro_required'" class="text-center py-4">
      <p class="text-sm text-slate-400 mb-3">{{ t('horizon.upgrade_prompt') }}</p>
      <NuxtLink to="/pro" class="inline-block px-4 py-2 bg-corona/20 border border-corona/40 rounded text-sm text-corona hover:bg-corona/30 transition-colors">
        {{ t('horizon.upgrade_button', 'Upgrade to Pro') }}
      </NuxtLink>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-sm text-red-400 py-4">
      {{ error }}
    </div>

    <!-- Result -->
    <div v-else-if="result">
      <div v-if="!result.in_totality_path" class="text-sm text-slate-400 py-2">
        {{ t('horizon.outside_path', 'This location is outside the path of totality.') }}
      </div>
      <template v-else>
        <HorizonBadge :verdict="result.verdict" :clearance="result.clearance_degrees" class="mb-3" />

        <HorizonProfile v-if="profileData" :data="profileData" :lat="lat" :lng="lng" :height="200" class="mb-3" />

        <div class="flex items-center gap-3 mt-3">
          <PeakFinderLink
            :lat="lat"
            :lng="lng"
            :elevation="result.observer_elevation_m"
            :sun-azimuth="result.sun_azimuth"
            spot-name="Custom Location"
          />
          <a
            :href="navigateUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-void-border/40 bg-void-surface text-sm text-slate-300 hover:text-white hover:border-corona/40 transition-colors"
          >
            {{ t('horizon.navigate_here', 'Navigate here') }}
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </template>
    </div>
  </div>
</template>
