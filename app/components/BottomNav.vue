<script setup lang="ts">
import IconHome from './icons/IconHome.vue'
import IconSpots from './icons/IconSpots.vue'
import IconMap from './icons/IconMap.vue'
import IconGuide from './icons/IconGuide.vue'
import IconMe from './icons/IconMe.vue'
import type { NavIcon } from '~/composables/useNavItems'

const route = useRoute()
const { isPro } = useProStatus()
const { items, isActive } = useNavItems()

// Pro-gated mobile nav: hidden on the public landing and for non-Pro
// visitors. Desktop swaps to the masthead in BrandBar (handled by CSS).
const showNav = computed(() => isPro.value && route.path !== '/')

const iconMap: Record<NavIcon, ReturnType<typeof defineComponent>> = {
  home:  IconHome,
  spots: IconSpots,
  map:   IconMap,
  guide: IconGuide,
  me:    IconMe,
}

// Light haptic on tap — PWA on iOS only fires this when the page is
// installed to the home screen and the user has tapped recently. No-op
// in browsers without the API. Guarded so SSR / older browsers skip it.
function tapFeedback() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(5) } catch { /* swallow rare WebKit reject */ }
  }
}
</script>

<template>
  <nav v-if="showNav" class="bottom-nav" aria-label="Primary">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="bottom-nav-item"
      :class="{ active: isActive(item.to) }"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      @click="tapFeedback"
    >
      <component :is="iconMap[item.icon]" class="bottom-nav-icon" aria-hidden="true" />
      <span class="bottom-nav-label">{{ item.label.toUpperCase() }}</span>
      <span class="bottom-nav-dot" aria-hidden="true" />
    </NuxtLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgb(var(--bg-elevated) / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  /* pt-3.5 + pb-7 from the spec, with safe-area override for notched phones. */
  padding: 14px 0 28px;
  padding-bottom: max(28px, env(safe-area-inset-bottom));
}
@media (min-width: 768px) {
  .bottom-nav { display: none; }
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 44px;
  padding: 4px 0;
  text-decoration: none;
  color: rgb(var(--ink-1) / 0.62);
  transition: color 0.2s ease;
}
.bottom-nav-item:hover {
  color: rgb(var(--ink-1));
}
.bottom-nav-item.active {
  color: rgb(var(--accent));
}

.bottom-nav-icon {
  width: 20px;
  height: 20px;
  color: inherit;
}

.bottom-nav-label {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.4px;
  color: inherit;
}

/* 4px amber dot on the active tab; transparent when inactive (so the
   layout doesn't shift between active states). */
.bottom-nav-dot {
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: transparent;
}
.bottom-nav-item.active .bottom-nav-dot {
  background: rgb(var(--accent));
}
</style>
