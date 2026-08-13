import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BrandBar from '~/components/BrandBar.vue'

// vue-i18n is stubbed globally in tests/mocks/setup.ts — that stub
// provides `t`, `tm`, `te`, `locale`, and `locales`, which LocaleSwitcher
// (rendered inside BrandBar) needs.

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
}))
import { useProStatus } from '~/composables/useProStatus'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(useProStatus).mockReturnValue({
    isPro: ref(false), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
  } as any)
})

describe('BrandBar', () => {
  it('renders the masthead links on tablet+', async () => {
    const wrapper = await mountSuspended(BrandBar)
    // Masthead should be present (its display:none on mobile is CSS-only,
    // the markup still mounts).
    expect(wrapper.find('nav.masthead').exists()).toBe(true)
  })

  it('offers no purchase or restore CTA', async () => {
    const wrapper = await mountSuspended(BrandBar)
    expect(wrapper.html()).not.toContain('/pro')
    expect(wrapper.find('[data-testid="brandbar-get-pro"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="brandbar-restore"]').exists()).toBe(false)
  })

  it('offers no purchase CTA on public pages either', async () => {
    const wrapper = await mountSuspended(BrandBar, { route: '/spots' })
    expect(wrapper.html()).not.toContain('/pro')
  })
})
