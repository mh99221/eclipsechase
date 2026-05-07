import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BrandBar from '~/components/BrandBar.vue'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useI18n: () => ({ t: (k: string, fallback?: string) => fallback ?? k }),
  }
})

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
}))
import { useProStatus } from '~/composables/useProStatus'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('BrandBar', () => {
  it('renders the masthead links for free users on tablet+', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BrandBar)
    // Masthead should be present (its display:none on mobile is CSS-only,
    // the markup still mounts).
    expect(wrapper.find('nav.masthead').exists()).toBe(true)
  })

  it('shows the Get Pro pill in the right slot for free users off /pro', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BrandBar, { route: '/spots' })
    expect(wrapper.find('[data-testid="brandbar-get-pro"]').exists()).toBe(true)
  })

  it('does not show the Get Pro pill for Pro users', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(true), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BrandBar)
    expect(wrapper.find('[data-testid="brandbar-get-pro"]').exists()).toBe(false)
  })
})
