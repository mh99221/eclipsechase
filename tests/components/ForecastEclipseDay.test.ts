import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ForecastEclipseDay from '~/components/spot-detail/forecast/ForecastEclipseDay.vue'

// Öndverðarnes; station 178 sits ~3 km away, station 1 is Reykjavík.
const SPOT = { lat: 64.878, lng: -24.041, slug: 'ondverdarnes-svortuloft' }

const STATIONS = {
  stations: [
    { id: '178', name: 'Gufuskálar', lat: 64.9, lng: -24.0, region: 'snaefellsnes' },
    { id: '1', name: 'Reykjavík', lat: 64.13, lng: -21.9, region: 'reykjavik' },
  ],
}

let cloudResponse: any

vi.stubGlobal('$fetch', vi.fn((url: string) => {
  if (String(url).includes('/api/weather/stations')) return Promise.resolve(STATIONS)
  if (String(url).includes('/api/weather/cloud-cover')) return Promise.resolve(cloudResponse)
  return Promise.resolve({})
}))

/** useFetch memoises by key across mounts; drop it between cases. */
function resetFetchCache() {
  const payload = useNuxtApp().payload as any
  delete payload.data['cloud-cover-eclipse']
  delete payload.data['weather-stations']
}

async function mount() {
  const wrapper = await mountSuspended(ForecastEclipseDay, { props: { spot: SPOT } })
  // let the lazy useFetch microtasks settle
  await new Promise(r => setTimeout(r, 0))
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('ForecastEclipseDay', () => {
  beforeEach(() => {
    resetFetchCache()
    cloudResponse = {
      available: true,
      stale: false,
      fetched_at: '2026-08-07T11:00:00Z',
      cloud_cover: [
        { station_id: '178', cloud_cover: 72, forecast_valid_at: '2026-08-12T18:00:00Z' },
        { station_id: '1', cloud_cover: 95, forecast_valid_at: '2026-08-12T18:00:00Z' },
      ],
    }
  })

  it('shows the Aug-12 cloud cover from the nearest station', async () => {
    const wrapper = await mount()
    const text = wrapper.text()
    expect(text).toContain('72')
    expect(text).toContain('Gufuskálar')
    // Must not pick the far-away Reykjavík reading.
    expect(text).not.toContain('95')
  })

  it('reports the forecast slot it actually used, in UTC', async () => {
    const wrapper = await mount()
    expect(wrapper.text()).toContain('18:00')
  })

  it('renders nothing while the eclipse forecast is unavailable', async () => {
    cloudResponse = { available: false, stale: false, fetched_at: null, cloud_cover: [] }
    const wrapper = await mount()
    expect(wrapper.find('.eclipse-day-wrap').exists()).toBe(false)
  })

  it('renders nothing when the nearest station has no eclipse-day slot', async () => {
    cloudResponse = {
      available: true,
      stale: false,
      fetched_at: '2026-08-07T11:00:00Z',
      // Only the far station reached the window.
      cloud_cover: [{ station_id: '1', cloud_cover: 95, forecast_valid_at: '2026-08-12T18:00:00Z' }],
    }
    const wrapper = await mount()
    expect(wrapper.find('.eclipse-day-wrap').exists()).toBe(false)
  })
})
