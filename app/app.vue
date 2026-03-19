<script setup lang="ts">
const { hasConsent, loadUmami } = useAnalyticsConsent()

onMounted(() => {
  if (hasConsent.value) loadUmami()
})
</script>

<template>
  <div class="min-h-screen">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <CookieConsent />
  </div>
</template>
