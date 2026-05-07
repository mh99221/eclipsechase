<script setup lang="ts">
// Initialize analytics consent — auto-loads Umami if user previously consented
useAnalyticsConsent()

const route = useRoute()
const { isPro } = useProStatus()

const normalizedPath = computed(() => {
  const p = route.path
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
})
const isLanding = computed(() => normalizedPath.value === '/')
const isMap = computed(() => normalizedPath.value === '/map')

// Bottom padding only on mobile — desktop swaps bottom nav for nothing yet.
// PageShell already adds 90px bottom padding on Pro pages, so this is for
// any legacy page that doesn't use PageShell yet.
const mobileNavPadding = computed(() => isPro.value && !isLanding.value && !isMap.value)
</script>

<template>
  <div class="min-h-screen" :class="{ 'pb-20 md:pb-0': mobileNavPadding }">
    <NuxtLoadingIndicator color="#E89A3C" :height="2" :throttle="200" />
    <NuxtRouteAnnouncer />

    <BrandBar />

    <NuxtPage />
    <BottomNav />
    <CookieConsent />
    <UpsellSheet />
  </div>
</template>
