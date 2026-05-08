/**
 * Shared nav items used by both the desktop top nav (masthead) and the
 * mobile bottom nav. Pro-aware: `Home` resolves to `/` for free users
 * and `/dashboard` for Pro users; `Map` is marked `locked` when the user
 * is not Pro so consumers can intercept the click and open the upsell
 * sheet instead of routing.
 *
 * `Me` stays in NAV_ITEMS_HIDDEN — its features (theme, sign out, restore)
 * already live in BrandBar's right slot or on /pro.
 */
export type NavIcon = 'map' | 'home' | 'spots' | 'guide' | 'me'

export interface NavItem {
  to: string
  label: string
  icon: NavIcon
  locked?: boolean
}

const NAV_ITEMS_HIDDEN: readonly NavItem[] = [
  { to: '/me', label: 'Me', icon: 'me' },
] as const
void NAV_ITEMS_HIDDEN

export function useNavItems() {
  const route = useRoute()
  const { isPro } = useProStatus()

  const items = computed<NavItem[]>(() => [
    { to: isPro.value ? '/dashboard' : '/', label: 'Home',  icon: 'home' },
    { to: '/spots',                                label: 'Spots', icon: 'spots' },
    { to: '/map',                                  label: 'Map',   icon: 'map', locked: !isPro.value },
    { to: '/guide',                                label: 'Guide', icon: 'guide' },
  ])

  function isActive(to: string): boolean {
    if (to === '/spots') return route.path.startsWith('/spots')
    if (to === '/me') return route.path.startsWith('/me')
    return route.path === to
  }

  return { items, isActive }
}
