<script setup lang="ts">
const { isPro } = useProStatus()
const route = useRoute()
const { items: navItems, isActive: isNavActive } = useNavItems()

const isLanding = computed(() => route.path === '/')
const isMap = computed(() => route.path === '/map')

// Desktop masthead nav: shown for Pro users on non-landing pages, mirrors
// the legacy app.vue behavior so the desktop layout has horizontal nav
// between the brand and the user menu.
const showMasthead = computed(() => isPro.value && !isLanding.value)
</script>

<template>
  <header class="brand-bar">
    <!-- /map is full-bleed so the inner row spans the viewport width.
         Other pages use the standard reading column. -->
    <div :class="['brand-bar-inner', isMap ? 'is-map' : 'is-content']">
      <NuxtLink to="/" aria-label="EclipseChase — Home" class="brand-mark">
        <BrandLogo />
      </NuxtLink>

      <!-- Desktop masthead — only on Pro non-landing pages -->
      <ClientOnly>
        <nav
          v-if="showMasthead"
          class="masthead"
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

      <div class="brand-bar-right">
        <span v-if="isLanding" class="brand-bar-coords">
          <span class="hide-sm">64.1°N 21.9°W · </span>AUG 12 2026
        </span>
        <ClientOnly v-else><UserMenu /></ClientOnly>
      </div>
    </div>
  </header>
</template>

<style scoped>
.brand-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background: rgb(var(--bg-elevated) / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
}
.brand-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(env(safe-area-inset-top), 14px) 16px 14px;
  min-height: 60px;
  gap: 14px;
}
.brand-bar-inner.is-content {
  max-width: 1120px;       /* roomier on desktop, max-w-3xl was too tight for the masthead */
  margin: 0 auto;
}
.brand-bar-inner.is-map {
  width: 100%;
}
@media (min-width: 1024px) {
  .brand-bar-inner {
    padding-left: 24px;
    padding-right: 24px;
  }
}

.brand-mark {
  display: flex;
  align-items: center;
  text-decoration: none;
  min-height: 44px;
}
.brand-bar-coords {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: rgb(var(--ink-1) / 0.62);
}
.brand-bar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 44px;
}

/* Masthead — hidden on mobile; surfaces inline links on tablet+ where the
   bottom nav is hidden. Reuses the v0 mono caps + amber active dot pattern. */
.masthead {
  display: none;
  align-items: center;
  gap: 32px;
}
@media (min-width: 768px) {
  .masthead { display: flex; }
}
.masthead-link {
  position: relative;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  text-decoration: none;
  padding: 4px 0;
  transition: color 0.2s ease;
}
.masthead-link:hover { color: rgb(var(--ink-1)); }
.masthead-link.active { color: rgb(var(--accent)); }
.masthead-link.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 99px;
  background: rgb(var(--accent));
  box-shadow: 0 0 8px rgb(var(--accent) / 0.7);
}

@media (max-width: 480px) {
  .hide-sm { display: none; }
}
</style>
