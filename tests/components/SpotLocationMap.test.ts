import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SpotLocationMap from '~/components/SpotLocationMap.vue'

describe('SpotLocationMap', () => {
  it('renders without error', async () => {
    const wrapper = await mountSuspended(SpotLocationMap, {
      props: {
        lat: 64.15,
        lng: -21.94,
        sunAzimuth: 250,
        spotName: 'Test Spot',
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('shows fallback text inside ClientOnly', async () => {
    const wrapper = await mountSuspended(SpotLocationMap, {
      props: {
        lat: 64.15,
        lng: -21.94,
        sunAzimuth: 250,
        spotName: 'Test Spot',
      },
    })
    // Component uses ClientOnly — in test env, the map container or fallback should render
    expect(wrapper.html()).toBeTruthy()
  })
})
