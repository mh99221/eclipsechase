<script setup lang="ts">
// Initialize analytics consent — auto-loads Umami if user previously consented
useAnalyticsConsent()
</script>

<template>
  <div class="min-h-screen">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <BottomNav />
    <CookieConsent />
  </div>
</template>
