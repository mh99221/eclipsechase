<script setup lang="ts">
const { t } = useI18n()
const { isPro, loading: proLoading, clearPro } = useProStatus()
const route = useRoute()
const { items: navItems, isActive: isNavActive } = useNavItems()

// Resolve the route's base name (strips the ___<locale> suffix that
// @nuxtjs/i18n appends to every route under `prefix_except_default`).
// This is the locale-agnostic way to recognise routes — the previous
// `route.path === '/map'` etc. comparisons missed `/is/map`,
// `/is/pro`, `/is/` because those have a locale prefix in the path.
// Symptom: on /is/map the BrandBar fell back to the 768 px `is-content`
// layout instead of the full-width `is-map` one.
const getRouteBaseName = useRouteBaseName()
const baseName = computed(() => String(getRouteBaseName(route) ?? ''))

const isLanding = computed(() => baseName.value === 'index')
const isMap = computed(() => baseName.value === 'map')
// /check is a free-tier tool surface that intentionally drops the
// page-level nav: shared visitors (Reddit, link previews) should
// focus on the result. Brand-mark + right slot (locale) remain so
// they can still find their way around.
const isCheck = computed(() => baseName.value === 'check')

// Scroll-aware transparency on `/` — start transparent over the cinematic
// hero, transition to the standard backdrop blur after 300px of scroll.
const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 300
}
onMounted(() => {
  if (!import.meta.client) return
  if (isLanding.value) {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  }
})
onUnmounted(() => {
  if (import.meta.client) window.removeEventListener('scroll', onScroll)
})
watch(isLanding, (landing) => {
  if (!import.meta.client) return
  if (landing) {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  } else {
    window.removeEventListener('scroll', onScroll)
    scrolled.value = false
  }
})

const isLoggingOut = ref(false)
async function handleLogout() {
  isLoggingOut.value = true
  try {
    await clearPro()
    navigateTo('/')
  }
  finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <header
    class="brand-bar"
    :class="{ 'is-landing': isLanding, 'is-scrolled': scrolled }"
  >
    <div :class="['brand-bar-inner', isMap ? 'is-map' : 'is-content']">
      <!-- prefetch="false": brand-mark is in every page's viewport, so
           default prefetch leaks the landing-page chunk (~11 KB CSS,
           100% unused per Lighthouse) onto every route. -->
      <NuxtLinkLocale to="/" :prefetch="false" aria-label="EclipseChase — Home" class="brand-mark">
        <BrandLogo />
      </NuxtLinkLocale>

      <!-- Masthead renders in SSR so the bare-logo flash on hard reload
           is gone. Every item is a plain link now — the gated routes were
           retired 2026-08-13, so there is nothing to lock or swap on
           hydration. -->
      <nav v-if="!isCheck" class="masthead" aria-label="Primary">
        <NuxtLinkLocale
          v-for="item in navItems"
          :key="item.to + item.icon"
          :to="item.to"
          class="masthead-link"
          :class="{ active: isNavActive(item.to) }"
          :aria-current="isNavActive(item.to) ? 'page' : undefined"
        >
          {{ item.label }}
        </NuxtLinkLocale>
      </nav>

      <div class="brand-bar-right">
        <!-- Locale switcher renders unconditionally for both free and
             Pro users. Sits OUTSIDE the ClientOnly wrapper so it
             appears in SSR and doesn't shift on hydrate. -->
        <LocaleSwitcher class="hidden sm:inline-flex" />
        <ClientOnly>
          <div v-if="isPro && !proLoading" class="flex items-center gap-3">
            <span class="hidden sm:inline font-mono text-[10px] text-accent/60 tracking-wider uppercase">
              {{ t('pro.badge', 'Pro') }}
            </span>
            <ThemeToggle />
            <button
              :disabled="isLoggingOut"
              class="font-mono text-[10px] text-ink-3 hover:text-ink-2 tracking-wider uppercase transition-colors disabled:opacity-50"
              @click="handleLogout"
            >
              {{ t('auth.logout') }}
            </button>
          </div>
        </ClientOnly>
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
  transition: background 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease;
}
/* Cinematic / on landing — no solid bar or blur until scrolled past the
   hero, but keep a soft top-down scrim so the nav stays legible over the
   starfield. The scrim also guards readability if the scroll listener
   never engages (slow hydration, stale SW bundle): the menu can't end up
   floating fully transparent over bright content. */
.brand-bar.is-landing:not(.is-scrolled) {
  background: linear-gradient(
    180deg,
    rgb(var(--bg-elevated) / 0.6) 0%,
    rgb(var(--bg-elevated) / 0.28) 55%,
    transparent 100%
  );
  border-bottom-color: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
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
  max-width: 768px;
  margin: 0 auto;
}
.brand-bar-inner.is-map { width: 100%; }
@media (min-width: 1024px) {
  .brand-bar-inner { padding-left: 24px; padding-right: 24px; }
}

.brand-mark {
  display: flex;
  align-items: center;
  text-decoration: none;
  min-height: 44px;
}
.brand-bar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 44px;
}

.masthead {
  display: none;
  align-items: center;
  gap: 24px;
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
  /* Keep each label on its own row — the /is/* captions are longer and
     would otherwise wrap inside the 24 px masthead gap. */
  white-space: nowrap;
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
</style>
