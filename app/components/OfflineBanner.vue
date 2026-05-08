<script setup lang="ts">
// Stale-data state is conveyed by the MapStatusStack pill (desktop) and
// the MapMobileStatusPill (mobile), so the banner now only surfaces the
// offline (network-down) case to avoid duplicating the same signal.
const { t } = useI18n()
const { isOffline, lastWeatherUpdate } = useOfflineStatus()

const dismissed = ref(false)

watch(isOffline, (offline) => {
  if (offline) dismissed.value = false
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div v-if="!dismissed && isOffline" class="relative z-20">
      <div class="px-3 py-2 ec-banner-warn flex items-center gap-2 text-xs font-mono">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
          <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span>
          {{ t('offline.banner_offline') }}
          <span v-if="lastWeatherUpdate" class="opacity-70">
            · {{ t('offline.last_updated', { time: lastWeatherUpdate }) }}
          </span>
        </span>
        <button class="ml-auto opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss" @click="dismissed = true">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>
