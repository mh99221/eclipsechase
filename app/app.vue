<script setup lang="ts">
// Initialize analytics consent — auto-loads Umami if user previously consented
useAnalyticsConsent()

const route = useRoute()
const { isPro } = useProStatus()
// Add bottom padding for fixed nav bar — except on landing page and full-screen pages
const fullScreenPages = ['/', '/map']
const navPadding = computed(() => isPro.value && !fullScreenPages.includes(route.path))

// Fixed top nav: hide on map (full-screen), show everywhere else
const showTopNav = computed(() => route.path !== '/map')
const isLanding = computed(() => route.path === '/')
const isRecommend = computed(() => route.path === '/recommend')
</script>

<template>
  <div class="min-h-screen" :class="{ 'pb-16': navPadding }">
    <NuxtLoadingIndicator color="#f59e0b" :height="2" :throttle="200" />
    <NuxtRouteAnnouncer />

    <!-- Fixed top nav — outer bar stretches edge-to-edge, inner content aligns to reading column -->
    <div v-if="showTopNav" class="fixed top-0 left-0 right-0 z-50 bg-void/97 backdrop-blur-md">
      <nav class="section-container max-w-3xl flex items-center justify-between py-5">
        <NuxtLink to="/" aria-label="EclipseChase — Home" class="flex items-center gap-3 group">
          <svg class="w-8 h-8" viewBox="0 0 128 128" fill="none" aria-hidden="true">
            <circle cx="64" cy="64" r="36" fill="#050810" />
            <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
            <circle cx="96" cy="48" r="4" fill="#f59e0b" />
          </svg>
          <span class="font-display font-semibold text-base tracking-wide text-slate-300 group-hover:text-white transition-colors">
            ECLIPSECHASE
          </span>
        </NuxtLink>

        <!-- Landing: coords + date -->
        <div v-if="isLanding" class="flex items-center gap-4">
          <span class="hidden sm:inline text-xs font-mono text-slate-500 tracking-wider">64.1°N 21.9°W</span>
          <div class="w-px h-4 bg-void-border hidden sm:block" />
          <span class="text-xs font-mono text-corona/70 tracking-wider">AUG 12 2026</span>
        </div>

        <!-- Recommend: UserMenu -->
        <div v-else-if="isRecommend">
          <ClientOnly><UserMenu /></ClientOnly>
        </div>
      </nav>
    </div>

    <NuxtPage />
    <BottomNav />
    <CookieConsent />
  </div>
</template>
