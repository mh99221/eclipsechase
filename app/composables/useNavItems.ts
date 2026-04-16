/**
 * Shared nav items used by both the desktop top nav (masthead) and the
 * mobile bottom nav. Keeps labels, routes, and active-state detection
 * in one place.
 */
export type NavIcon = 'map' | 'home' | 'spots' | 'guide'

export interface NavItem {
  to: string
  label: string
  icon: NavIcon
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard', label: 'Home',  icon: 'home' },
  { to: '/guide',     label: 'Guide', icon: 'guide' },
  { to: '/spots',     label: 'Spots', icon: 'spots' },
  { to: '/map',       label: 'Map',   icon: 'map' },
] as const

export function useNavItems() {
  const route = useRoute()

  function isActive(to: string): boolean {
    if (to === '/spots') return route.path.startsWith('/spots')
    return route.path === to
  }

  return { items: NAV_ITEMS, isActive }
}
