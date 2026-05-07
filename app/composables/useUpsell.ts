/**
 * Single source of truth for the Pro upsell sheet. The sheet is mounted
 * once at app.vue level; any consumer (BottomNav, BrandBar masthead,
 * Home Map tile) opens it via `openUpsell({ source })`.
 *
 * Session-scoped dismissal: after the user closes the sheet, subsequent
 * `nav`-sourced opens are suppressed within the same session — habitual
 * tab taps shouldn't keep nagging. `tile`-sourced opens always succeed
 * because they're explicit, in-page user actions.
 */

type UpsellSource = 'nav' | 'tile'

const DISMISSAL_KEY = 'eclipsechase.upsell.dismissed'

export function useUpsell() {
  const isOpen = useState<boolean>('upsell-open', () => false)

  function isDismissed(): boolean {
    if (typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem(DISMISSAL_KEY) === '1'
  }

  function openUpsell(opts: { source: UpsellSource }) {
    if (opts.source === 'nav' && isDismissed()) return
    isOpen.value = true
  }

  function closeUpsell() {
    isOpen.value = false
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(DISMISSAL_KEY, '1')
    }
  }

  return { isOpen, openUpsell, closeUpsell }
}
