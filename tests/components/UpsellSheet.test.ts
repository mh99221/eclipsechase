import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UpsellSheet from '~/components/UpsellSheet.vue'

// vue-i18n is stubbed globally in tests/mocks/setup.ts.

beforeEach(() => {
  // Force isOpen=true via direct state seed
  const sessionStore = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => sessionStore.get(k) ?? null,
    setItem: (k: string, v: string) => { sessionStore.set(k, v) },
    removeItem: (k: string) => { sessionStore.delete(k) },
    clear: () => sessionStore.clear(),
  })
  // Clean teleported content from prior tests (Teleport renders into document.body
  // which persists across mountSuspended calls in happy-dom). Strip everything
  // outside the Nuxt root so leftover transition-stubs don't double-count.
  Array.from(document.body.children).forEach((el) => {
    if (el.id !== '__nuxt') el.remove()
  })
  // Reset Nuxt's useState singleton for the upsell composable.
  const { closeUpsell } = useUpsell()
  closeUpsell()
})

describe('UpsellSheet', () => {
  it('does not render when closed', async () => {
    await mountSuspended(UpsellSheet)
    // Default state is closed; Teleport-to-body content is queried via document.
    expect(document.querySelector('[data-testid="upsell-sheet"]')).toBeNull()
  })

  it('renders title, three bullets, and both CTAs when opened', async () => {
    await mountSuspended({
      components: { UpsellSheet },
      template: '<UpsellSheet />',
      setup() {
        const { openUpsell } = useUpsell()
        openUpsell({ source: 'tile' })
        return {}
      },
    })
    await nextTick()
    const sheet = document.querySelector('[data-testid="upsell-sheet"]')
    expect(sheet).not.toBeNull()
    expect(document.querySelector('[data-testid="upsell-cta-primary"]')?.getAttribute('href')).toBe('/pro')
    expect(document.querySelector('[data-testid="upsell-cta-secondary"]')?.getAttribute('href')).toBe('/pro#restore')
    expect(document.querySelectorAll('[data-testid="upsell-bullet"]')).toHaveLength(3)
  })
})
