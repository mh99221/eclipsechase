<script setup lang="ts">
// Initialize analytics consent — auto-loads Umami if user previously consented
useAnalyticsConsent()
</script>

<template>
  <div class="min-h-screen">
    <NuxtLoadingIndicator color="#f59e0b" :height="2" :throttle="200" />
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <BottomNav />
    <CookieConsent />
  </div>
</template>
