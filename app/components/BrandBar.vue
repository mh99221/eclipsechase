<script setup lang="ts">
const { t } = useI18n()
const { isPro, loading: proLoading, clearPro } = useProStatus()
const route = useRoute()
const { items: navItems, isActive: isNavActive } = useNavItems()
const { openUpsell } = useUpsell()

// Resolve the route's base name (strips the ___<locale> suffix that
// @nuxtjs/i18n appends to every route under `prefix_except_default`).
// This is the locale-agnostic way to recognise routes — the previous
// `route.path === '/map'` etc. comparisons missed `/is/map`,
// `/is/pro`, `/is/` because those have a locale prefix in the path.
// Symptom: on /is/map the BrandBar fell back to the 768 px `is-content`
// layout instead of the full-width `is-map` one.
const getRouteBaseName = useRouteBaseName()
// `getRouteBaseName` returns `keyof RouteMapI18n | undefined`, which is
// typed as `string | number | symbol | undefined`. The route names this
// codebase uses are all strings — coerce so .startsWith() etc. work.
const baseName = computed(() => String(getRouteBaseName(route) ?? ''))

const isLanding = computed(() => baseName.value === 'index')
const isMap = computed(() => baseName.value === 'map')
const isProRoute = computed(() => baseName.value === 'pro' || baseName.value.startsWith('pro-'))

// Free users see a small Get-Pro pill in the right slot on every page
// except / (where the in-page tile already serves that purpose) and
// /pro / /pro/success (where they're already on the upsell path).
const showFreeGetProPill = computed(
  () => !proLoading.value && !isPro.value && !isLanding.value && !isProRoute.value,
)

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
    navigateTo('/pro')
  }
  finally {
    isLoggingOut.value = false
  }
}

function onMastheadClick(item: { to: string; locked?: boolean }, e: MouseEvent) {
  if (item.locked) {
    e.preventDefault()
    openUpsell({ source: 'nav' })
  }
}
</script>

<template>
  <header
    class="brand-bar"
    :class="{ 'is-landing': isLanding, 'is-scrolled': scrolled }"
  >
    <div :class="['brand-bar-inner', isMap ? 'is-map' : 'is-content']">
      <NuxtLinkLocale to="/" aria-label="EclipseChase — Home" class="brand-mark">
        <BrandLogo />
      </NuxtLinkLocale>

      <!-- Masthead renders in SSR so the bare-logo flash on hard reload
           is gone. `useNavItems` reads `isPro` (default false on the
           server), so the SSR pass paints the free-user view; if the
           visitor is actually Pro, hydration just swaps Home's href
           and removes the Map lock — no layout shift. -->
      <nav class="masthead" aria-label="Primary">
        <NuxtLinkLocale
          v-for="item in navItems"
          :key="item.to + item.icon"
          :to="item.locked ? '#' : item.to"
          class="masthead-link"
          :class="{ active: isNavActive(item.to), locked: item.locked }"
          :aria-current="isNavActive(item.to) ? 'page' : undefined"
          :aria-disabled="item.locked || undefined"
          @click="(e: MouseEvent) => onMastheadClick(item, e)"
        >
          {{ item.label }}
          <span
            v-if="item.locked"
            :data-testid="`masthead-lock-${item.icon}`"
            class="masthead-lock"
            aria-hidden="true"
          >🔒</span>
        </NuxtLinkLocale>
      </nav>

      <div class="brand-bar-right">
        <!-- Locale switcher renders unconditionally for both free and
             Pro users. Sits OUTSIDE the ClientOnly wrapper so it
             appears in SSR and doesn't shift on hydrate. -->
        <LocaleSwitcher class="hidden sm:inline-flex" />
        <ClientOnly>
          <template v-if="showFreeGetProPill">
            <NuxtLinkLocale
              data-testid="brandbar-restore"
              to="/pro#restore"
              class="restore-link"
              :aria-label="t('v0.home.nav_restore_aria')"
            >
              {{ t('v0.home.nav_restore') }}
            </NuxtLinkLocale>
            <NuxtLinkLocale
              data-testid="brandbar-get-pro"
              to="/pro"
              class="get-pro-pill"
            >
              {{ t('v0.home.nav_get_pro') }}
            </NuxtLinkLocale>
          </template>
          <div v-else-if="isPro && !proLoading" class="flex items-center gap-3">
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
/* Cinematic / on landing — fully transparent until scrolled past hero. */
.brand-bar.is-landing:not(.is-scrolled) {
  background: transparent;
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
  /* Without nowrap, the lock-icon Map link breaks onto two lines on
     /is/* because "KORT 🔒" no longer fits the gap. Force everything
     onto its own row instead — overflow handled by the wider cap. */
  white-space: nowrap;
  transition: color 0.2s ease;
}
.masthead-link:hover { color: rgb(var(--ink-1)); }
.masthead-link.active { color: rgb(var(--accent)); }
.masthead-link.locked { color: rgb(var(--ink-1) / 0.42); }
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
.masthead-lock {
  display: inline-block;
  margin-left: -5px;
  font-size: 10px;
  filter: grayscale(0.4);
}

.get-pro-pill {
  display: inline-flex;
  align-items: center;
  background: rgb(var(--accent));
  color: rgb(var(--accent-ink));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 7px 12px;
  border-radius: 999px;
  text-decoration: none;
  /* "FÁ PRO" was wrapping into two stacked lines on /is/*, breaking
     the pill silhouette. Two short caps fit on one line at this size
     in either locale; just stop the line break. */
  white-space: nowrap;
  transition: background 0.2s ease;
}
.get-pro-pill:hover { background: rgb(var(--accent-strong)); }

/* Subordinate text link for returning Pro users — sits next to the
   GET PRO pill, deep-links to /pro#restore. Same mono cap stack as the
   masthead links so it reads as ambient nav, not a CTA. */
.restore-link {
  display: inline-flex;
  align-items: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  text-decoration: none;
  min-height: 44px;
  padding: 0 4px;
  /* "ENDURHEIMTA" is one word — keep it on one line in case sibling
     items push it against the Get Pro pill on tighter widths. */
  white-space: nowrap;
  transition: color 0.2s ease;
}
.restore-link:hover { color: rgb(var(--ink-1)); }
/* On <360 px the BrandBar gap gets tight. Drop the link letter-spacing
   first; if the wordmark still pinches we can hide it on the smallest
   phones via display:none here. */
@media (max-width: 359px) {
  .restore-link { letter-spacing: 0.06em; padding: 0 2px; }
}
</style>
