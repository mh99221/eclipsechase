<script setup lang="ts">
useAnalyticsConsent()

const route = useRoute()

const normalizedPath = computed(() => {
  const p = route.path
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
})
const isMap = computed(() => normalizedPath.value === '/map')

// BottomNav is now mounted for all users (it self-hides at md+ via CSS).
// /map is the one exception — it's full-bleed, so it manages its own
// bottom spacing via SelectedLightbox + map controls.
const mobileNavPadding = computed(() => !isMap.value)
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
