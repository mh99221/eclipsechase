<script setup lang="ts">
import IconHome from './icons/IconHome.vue'
import IconSpots from './icons/IconSpots.vue'
// IconMap / IconMe are no longer reachable through useNavItems (the Map
// tab was retired 2026-08-13), but NavIcon still declares them, so the
// lookup table has to stay total.
import IconMap from './icons/IconMap.vue'
import IconGuide from './icons/IconGuide.vue'
import IconMe from './icons/IconMe.vue'
import type { NavIcon } from '~/composables/useNavItems'

const { items, isActive } = useNavItems()

// /check is a free-tier tool surface that drops site nav to keep
// shared-link visitors focused on the result. Hide the entire bar
// (mobile only — BottomNav doesn't render at md+ anyway).
const route = useRoute()
const getRouteBaseName = useRouteBaseName()
const isHidden = computed(() => String(getRouteBaseName(route) ?? '') === 'check')

// BottomNav stays opaque on every route. The earlier scroll-aware
// transparency on `/` left the icons + labels visible without their
// surface whenever the cinematic hero + content fit the viewport
// without a 300 px scroll, which on mobile is the common case. The
// BrandBar still does scroll-aware transparency at the top because
// it sits directly on the hero; the bottom bar grounds the page.

const iconMap: Record<NavIcon, ReturnType<typeof defineComponent>> = {
  home:  IconHome,
  spots: IconSpots,
  map:   IconMap,
  guide: IconGuide,
  me:    IconMe,
}

function tapFeedback() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(5) } catch { /* swallow rare WebKit reject */ }
  }
}

function onTap() {
  tapFeedback()
}
</script>

<template>
  <!-- Bottom nav renders for all users; CSS hides it at md+ where the masthead takes over. -->
  <nav
    v-if="!isHidden"
    class="bottom-nav"
    aria-label="Primary"
  >
    <NuxtLinkLocale
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="bottom-nav-item"
      :class="{ active: isActive(item.to) }"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      @click="onTap"
    >
      <span class="bottom-nav-icon-wrap">
        <component :is="iconMap[item.icon]" class="bottom-nav-icon" aria-hidden="true" />
      </span>
      <span class="bottom-nav-label">{{ item.label.toUpperCase() }}</span>
      <span class="bottom-nav-dot" aria-hidden="true" />
    </NuxtLinkLocale>
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
  padding: 14px 0 18px;
  padding-bottom: max(18px, env(safe-area-inset-bottom));
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
.bottom-nav-item:hover { color: rgb(var(--ink-1)); }
.bottom-nav-item.active { color: rgb(var(--accent)); }

.bottom-nav-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.bottom-nav-icon { width: 20px; height: 20px; color: inherit; }

.bottom-nav-label {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.4px;
  color: inherit;
}

.bottom-nav-dot {
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: transparent;
}
.bottom-nav-item.active .bottom-nav-dot { background: rgb(var(--accent)); }
</style>
