import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BottomNav from '~/components/BottomNav.vue'

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
}))
import { useProStatus } from '~/composables/useProStatus'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('BottomNav', () => {
  it('renders for free users with a lock indicator on Map', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BottomNav)
    expect(wrapper.find('nav.bottom-nav').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-lock-map"]').exists()).toBe(true)
  })

  it('does not render the lock indicator for Pro users', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(true), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BottomNav)
    expect(wrapper.find('[data-testid="nav-lock-map"]').exists()).toBe(false)
  })
})
