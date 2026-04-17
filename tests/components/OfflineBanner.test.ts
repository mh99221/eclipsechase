import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OfflineBanner from '~/components/OfflineBanner.vue'

const mockIsOffline = ref(false)
const mockIsWeatherStale = ref(false)
const mockLastWeatherUpdate = ref<string | null>(null)

vi.mock('~/composables/useOfflineStatus', () => ({
  useOfflineStatus: () => ({
    isOffline: mockIsOffline,
    isWeatherStale: mockIsWeatherStale,
    lastWeatherUpdate: mockLastWeatherUpdate,
  }),
}))

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockIsOffline.value = false
    mockIsWeatherStale.value = false
    mockLastWeatherUpdate.value = null
  })

  it('does not render when online and data is fresh', async () => {
    const wrapper = await mountSuspended(OfflineBanner)
    // No banner should show
    expect(wrapper.find('.ec-banner-warn').exists()).toBe(false)
    expect(wrapper.find('.ec-banner-info').exists()).toBe(false)
  })

  it('shows offline banner when offline', async () => {
    mockIsOffline.value = true
    const wrapper = await mountSuspended(OfflineBanner)
    expect(wrapper.find('.ec-banner-warn').exists()).toBe(true)
  })

  it('shows stale data banner when weather is stale', async () => {
    mockIsWeatherStale.value = true
    const wrapper = await mountSuspended(OfflineBanner)
    expect(wrapper.find('.ec-banner-info').exists()).toBe(true)
  })

  it('shows last weather update time when available', async () => {
    mockIsOffline.value = true
    mockLastWeatherUpdate.value = '5 min ago'
    const wrapper = await mountSuspended(OfflineBanner)
    expect(wrapper.text()).toContain('5 min ago')
  })

  it('has dismiss button', async () => {
    mockIsOffline.value = true
    const wrapper = await mountSuspended(OfflineBanner)
    const dismissBtn = wrapper.find('button[aria-label="Dismiss"]')
    expect(dismissBtn.exists()).toBe(true)
  })

  it('hides banner when dismiss is clicked', async () => {
    mockIsOffline.value = true
    const wrapper = await mountSuspended(OfflineBanner)
    const dismissBtn = wrapper.find('button[aria-label="Dismiss"]')
    await dismissBtn.trigger('click')
    // After dismissing, should be hidden
    expect(wrapper.find('.ec-banner-warn').exists()).toBe(false)
  })
})
