/**
 * Single source of truth for the Pro upsell sheet. The sheet is mounted
 * once at app.vue level; any consumer (BottomNav, BrandBar masthead,
 * Home Map tile) opens it via `openUpsell({ source })`.
 *
 * Session-scoped dismissal: after the user closes the sheet, subsequent
 * `nav`-sourced opens are suppressed within the same session — habitual
 * tab taps shouldn't keep nagging. `tile`-sourced opens always succeed
 * because they're explicit, in-page user actions; closing a tile-opened
 * sheet does not set the dismissal flag, so a later nav tap can still
 * surface the prompt.
 */

type UpsellSource = 'nav' | 'tile'

const DISMISSAL_KEY = 'eclipsechase.upsell.dismissed'

let lastSource: UpsellSource | null = null

export function useUpsell() {
  const isOpen = useState<boolean>('upsell-open', () => false)

  function isDismissed(): boolean {
    try { return sessionStorage.getItem(DISMISSAL_KEY) === '1' }
    catch { return false }
  }

  function openUpsell(opts: { source: UpsellSource }) {
    if (opts.source === 'nav' && isDismissed()) return
    lastSource = opts.source
    isOpen.value = true
  }

  function closeUpsell() {
    isOpen.value = false
    if (lastSource === 'nav') {
      try { sessionStorage.setItem(DISMISSAL_KEY, '1') }
      catch { /* sessionStorage may be unavailable */ }
    }
  }

  return { isOpen, openUpsell, closeUpsell }
}
