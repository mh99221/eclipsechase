import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import WeatherIcon from '~/components/WeatherIcon.vue'

describe('WeatherIcon', () => {
  it('renders an SVG for clear skies (0% cloud cover)', async () => {
    const wrapper = await mountSuspended(WeatherIcon, {
      props: { cloudCover: 0 },
    })
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('renders an SVG for overcast (100% cloud cover)', async () => {
    const wrapper = await mountSuspended(WeatherIcon, {
      props: { cloudCover: 100 },
    })
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('renders question mark for null cloud cover', async () => {
    const wrapper = await mountSuspended(WeatherIcon, {
      props: { cloudCover: null },
    })
    expect(wrapper.html()).toContain('?')
  })

  it('uses custom size prop', async () => {
    const wrapper = await mountSuspended(WeatherIcon, {
      props: { cloudCover: 50, size: 48 },
    })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('48')
    expect(svg.attributes('height')).toBe('48')
  })

  it('defaults size to 36', async () => {
    const wrapper = await mountSuspended(WeatherIcon, {
      props: { cloudCover: 50 },
    })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('36')
  })
})
