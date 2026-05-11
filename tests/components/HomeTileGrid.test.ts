import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HomeTileGrid from '~/components/HomeTileGrid.vue'

// vue-i18n is stubbed globally in tests/mocks/setup.ts.

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
}))
import { useProStatus } from '~/composables/useProStatus'

beforeEach(() => { vi.resetAllMocks() })

describe('HomeTileGrid', () => {
  it('renders 4 tiles for free users including Get Pro and locked Map', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(HomeTileGrid)
    expect(wrapper.findAll('[data-testid="home-tile"]')).toHaveLength(4)
    expect(wrapper.find('[data-testid-extra="home-tile-pro"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid-extra="home-tile-map"]').classes()).toContain('locked')
  })

  it('renders 4 tiles for Pro users with Dashboard replacing Get Pro, Map unlocked', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(true), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(HomeTileGrid)
    expect(wrapper.findAll('[data-testid="home-tile"]')).toHaveLength(4)
    expect(wrapper.find('[data-testid-extra="home-tile-pro"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid-extra="home-tile-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid-extra="home-tile-dashboard"]').attributes('href')).toBe('/dashboard')
    expect(wrapper.find('[data-testid-extra="home-tile-map"]').classes()).not.toContain('locked')
  })
})
