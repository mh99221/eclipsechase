/**
 * Shared nav items used by both the desktop top nav (masthead) and the
 * mobile bottom nav. Keeps labels, routes, and active-state detection
 * in one place.
 */
export type NavIcon = 'map' | 'home' | 'spots' | 'guide' | 'me'

export interface NavItem {
  to: string
  label: string
  icon: NavIcon
}

// v0 nav order — HOME · SPOTS · MAP · GUIDE · ME (PRODUCTION_SPEC.md §3.2).
// HOME points at /dashboard (the Pro user's home) rather than the literal
// `/` from the v0 spec — `/` is the public landing page in production,
// and Pro users shouldn't get sent back to a marketing surface from the
// bottom nav.
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard', label: 'Home',  icon: 'home' },
  { to: '/spots',     label: 'Spots', icon: 'spots' },
  { to: '/map',       label: 'Map',   icon: 'map' },
  { to: '/guide',     label: 'Guide', icon: 'guide' },
  { to: '/me',        label: 'Me',    icon: 'me' },
] as const

export function useNavItems() {
  const route = useRoute()

  function isActive(to: string): boolean {
    if (to === '/spots') return route.path.startsWith('/spots')
    if (to === '/me') return route.path.startsWith('/me')
    return route.path === to
  }

  return { items: NAV_ITEMS, isActive }
}
