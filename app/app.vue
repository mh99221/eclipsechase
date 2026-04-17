<script setup lang="ts">
// Initialize analytics consent — auto-loads Umami if user previously consented
useAnalyticsConsent()

const route = useRoute()
const { isPro } = useProStatus()
const { items: navItems, isActive: isNavActive } = useNavItems()

// normalise trailing-slash paths once so every check below is robust
const normalizedPath = computed(() => {
  const p = route.path
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
})
const isLanding = computed(() => normalizedPath.value === '/')
const isMap = computed(() => normalizedPath.value === '/map')

// Bottom padding only on mobile — desktop swaps bottom nav for a top-bar masthead
const mobileNavPadding = computed(() => isPro.value && !isLanding.value && !isMap.value)

// Show the desktop masthead links for Pro users on non-landing pages
const showMasthead = computed(() => isPro.value && !isLanding.value)

// On /map the nav stretches edge-to-edge so logo and masthead line up with
// the full-width map chrome instead of the narrow reading column.
const navInnerClass = computed(() =>
  isMap.value
    ? 'w-full px-4 sm:px-6 flex items-center justify-between gap-5 py-5'
    : 'section-container max-w-3xl flex items-center justify-between gap-5 py-5',
)
</script>

<template>
  <div class="min-h-screen" :class="{ 'pb-20 md:pb-0': mobileNavPadding }">
    <NuxtLoadingIndicator color="#f59e0b" :height="2" :throttle="200" />
    <NuxtRouteAnnouncer />

    <!-- Fixed top nav — outer bar stretches edge-to-edge. Inner container
         aligns to the 768px reading column on content pages, and to the
         full viewport width on /map so it spans the whole chrome above
         the map viewport. -->
    <div class="fixed top-0 left-0 right-0 z-50 bg-bg/[0.97] backdrop-blur-md">
      <nav :class="navInnerClass">
        <NuxtLink to="/" aria-label="EclipseChase — Home" class="flex items-center gap-3 group">
          <svg class="w-8 h-8" viewBox="0 0 128 128" fill="none" aria-hidden="true">
            <circle cx="64" cy="64" r="36" class="ec-logo-bg" />
            <circle cx="64" cy="64" r="36" class="ec-logo-ring" stroke-width="3" opacity="0.8" />
            <circle cx="96" cy="48" r="4" class="ec-logo-dot" />
          </svg>
          <span class="font-display font-semibold text-base tracking-wide text-ink-2 group-hover:text-ink-1 transition-colors">
            ECLIPSECHASE
          </span>
        </NuxtLink>

        <!-- Desktop masthead links: Pro users only, not on landing -->
        <ClientOnly>
          <nav
            v-if="showMasthead"
            class="hidden md:flex items-center gap-8"
            aria-label="Primary"
          >
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="masthead-link"
              :class="{ active: isNavActive(item.to) }"
              :aria-current="isNavActive(item.to) ? 'page' : undefined"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>
        </ClientOnly>

        <!-- Right side: landing → coords+date · otherwise → UserMenu -->
        <div v-if="isLanding" class="flex items-center gap-4">
          <span class="hidden sm:inline text-xs font-mono text-ink-3 tracking-wider">64.1°N 21.9°W</span>
          <div class="w-px h-4 bg-border-subtle hidden sm:block" />
          <span class="text-xs font-mono text-accent/70 tracking-wider">AUG 12 2026</span>
        </div>
        <div v-else>
          <ClientOnly><UserMenu /></ClientOnly>
        </div>
      </nav>
    </div>

    <NuxtPage />
    <BottomNav />
    <CookieConsent />
  </div>
</template>

<style scoped>
/* Masthead links — tracked mono caps, corona dot indicator when active */
.masthead-link {
  position: relative;
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgb(var(--ink-3));
  padding: 4px 0;
  transition: color 0.2s ease;
}
.masthead-link:hover {
  color: rgb(var(--accent-strong));
}
.masthead-link.active {
  color: rgb(var(--accent));
}
.masthead-link.active::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: rgb(var(--accent));
  border-radius: 50%;
  box-shadow: 0 0 8px rgb(var(--accent) / 0.7);
}
</style>
