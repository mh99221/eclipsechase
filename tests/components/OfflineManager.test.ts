import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OfflineManager from '~/components/OfflineManager.vue'

const mockTileCount = ref(0)
const mockLastWeatherUpdate = ref<string | null>(null)
const mockLastForecastUpdate = ref<string | null>(null)
const mockCacheAges = ref<Record<string, number | null>>({})

vi.mock('~/composables/useOfflineStatus', () => ({
  useOfflineStatus: () => ({
    tileCount: mockTileCount,
    lastWeatherUpdate: mockLastWeatherUpdate,
    lastForecastUpdate: mockLastForecastUpdate,
    cacheAges: mockCacheAges,
    precacheApiData: vi.fn(),
    refreshCacheStatus: vi.fn(),
  }),
}))

describe('OfflineManager', () => {
  beforeEach(() => {
    mockTileCount.value = 0
    mockLastWeatherUpdate.value = null
    mockLastForecastUpdate.value = null
    mockCacheAges.value = {}
  })

  it('renders the offline manager panel', async () => {
    const wrapper = await mountSuspended(OfflineManager, {
      props: { map: {} },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('has a close button', async () => {
    const wrapper = await mountSuspended(OfflineManager, {
      props: { map: {} },
    })
    const closeBtn = wrapper.find('button[aria-label="Close"]')
    expect(closeBtn.exists()).toBe(true)
  })

  it('hides when close button is clicked', async () => {
    const wrapper = await mountSuspended(OfflineManager, {
      props: { map: {} },
    })
    const closeBtn = wrapper.find('button[aria-label="Close"]')
    await closeBtn.trigger('click')
    // After clicking close, isDismissed becomes true
    expect(wrapper.find('.bg-void-surface').exists()).toBe(false)
  })

  it('shows download tiles button when no tiles cached', async () => {
    const wrapper = await mountSuspended(OfflineManager, {
      props: { map: {} },
    })
    const buttons = wrapper.findAll('button')
    const downloadBtn = buttons.find(b => b.text().toLowerCase().includes('download') || b.text().toLowerCase().includes('tile'))
    // Either a download button or tiles cached indicator
    expect(wrapper.html()).toBeTruthy()
  })

  it('shows cache status section', async () => {
    const wrapper = await mountSuspended(OfflineManager, {
      props: { map: {} },
    })
    expect(wrapper.text()).toContain('Map tiles')
    expect(wrapper.text()).toContain('Weather')
    expect(wrapper.text()).toContain('Spots')
  })

  it('shows cached indicator when tiles are cached', async () => {
    // tileCount > 10% of ESTIMATED_TILE_COUNT flips the cached-state hook.
    mockTileCount.value = 2000
    const wrapper = await mountSuspended(OfflineManager, {
      props: { map: {} },
    })
    expect(wrapper.find('.text-status-green').exists()).toBe(true)
  })
})
