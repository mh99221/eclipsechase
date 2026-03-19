<script setup lang="ts">
const { t } = useI18n()
const { isOffline, isWeatherStale, lastWeatherUpdate } = useOfflineStatus()

const dismissed = ref(false)

// Auto-show when going offline, auto-dismiss when back online + fresh
watch(isOffline, (offline) => {
  if (offline) dismissed.value = false
})
watch(isWeatherStale, (stale) => {
  if (!stale && !isOffline.value) dismissed.value = true
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
    <div v-if="!dismissed && (isOffline || isWeatherStale)" class="relative z-20">
      <!-- Offline -->
      <div
        v-if="isOffline"
        class="px-3 py-2 rounded bg-amber-900/15 border border-amber-700/20 flex items-center gap-2 text-xs font-mono text-amber-400/80"
      >
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
          <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span>
          {{ t('offline.banner_offline') }}
          <span v-if="lastWeatherUpdate" class="text-amber-500/60">
            · {{ t('offline.last_updated', { time: lastWeatherUpdate }) }}
          </span>
        </span>
        <button class="ml-auto text-amber-600/50 hover:text-amber-400 transition-colors" aria-label="Dismiss" @click="dismissed = true">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Stale data (online but old) -->
      <div
        v-else-if="isWeatherStale"
        class="px-3 py-2 rounded bg-blue-900/10 border border-blue-700/15 flex items-center gap-2 text-xs font-mono text-blue-400/60"
      >
        <span>
          {{ t('offline.banner_stale') }}
          <span v-if="lastWeatherUpdate" class="text-blue-500/40">
            · {{ t('offline.last_updated', { time: lastWeatherUpdate }) }}
          </span>
        </span>
        <button class="ml-auto text-blue-600/40 hover:text-blue-400 transition-colors" aria-label="Dismiss" @click="dismissed = true">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>
