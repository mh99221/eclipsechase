/**
 * Shared nav items used by both the desktop top nav (masthead) and the
 * mobile bottom nav.
 *
 * RETIRED 2026-08-13: the Map tab and the Pro-aware Home target are gone
 * along with the Pro app surfaces. Home always resolves to `/`, and no
 * item is `locked` — there is nothing left to upsell.
 *
 * Labels resolve through useI18n() so they follow the active locale.
 */
export type NavIcon = 'map' | 'home' | 'spots' | 'guide' | 'me'

export interface NavItem {
  to: string
  label: string
  icon: NavIcon
  locked?: boolean
}

export function useNavItems() {
  const route = useRoute()
  const { t } = useI18n()

  const items = computed<NavItem[]>(() => [
    { to: '/',       label: t('nav.home'),  icon: 'home' },
    { to: '/spots',  label: t('nav.spots'), icon: 'spots' },
    { to: '/guide',  label: t('nav.guide'), icon: 'guide' },
  ])

  function isActive(to: string): boolean {
    // `useRouteBaseName()` (from @nuxtjs/i18n) strips the
    // `___<locale>` suffix that the i18n module appends to every
    // route name, giving us a locale-agnostic identifier. Without
    // it, the previous `route.path === '/map'` / `startsWith('/spots')`
    // checks only matched the EN paths and left the active tab
    // unhighlighted on /is/* pages.
    //
    // Lazily resolved here (not at composable setup) so unit tests
    // that exercise only `items` don't need to wire up the i18n
    // plugin context — the real call only happens when a template
    // queries the active tab inside Vue's render scope.
    const getRouteBaseName = useRouteBaseName()
    const base = String(getRouteBaseName(route) ?? '')
    // /spots is a parent — match its child routes too
    // (e.g. /spots/[slug] has base name `spots-slug`).
    if (to === '/spots') return base === 'spots' || base.startsWith('spots-')
    if (to === '/') return base === 'index'
    // Strip the leading slash to get the canonical base name for the
    // remaining flat routes (`/dashboard` → `dashboard`, etc.).
    return base === to.replace(/^\//, '')
  }

  return { items, isActive }
}
