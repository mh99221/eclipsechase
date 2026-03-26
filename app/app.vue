<script setup lang="ts">
// Initialize analytics consent — auto-loads Umami if user previously consented
useAnalyticsConsent()

const route = useRoute()
const { isPro } = useProStatus()
// Add bottom padding for fixed nav bar — except on landing page and full-screen pages
const fullScreenPages = ['/', '/map']
const navPadding = computed(() => isPro.value && !fullScreenPages.includes(route.path))
</script>

<template>
  <div class="min-h-screen" :class="{ 'pb-16': navPadding }">
    <NuxtLoadingIndicator color="#f59e0b" :height="2" :throttle="200" />
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <BottomNav />
    <CookieConsent />
  </div>
</template>
