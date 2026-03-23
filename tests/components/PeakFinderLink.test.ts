import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PeakFinderLink from '~/components/PeakFinderLink.vue'

describe('PeakFinderLink', () => {
  const defaultProps = {
    lat: 64.15,
    lng: -21.94,
    elevation: 50,
    sunAzimuth: 250,
    spotName: 'Test Spot',
  }

  it('renders a link to PeakFinder', async () => {
    const wrapper = await mountSuspended(PeakFinderLink, {
      props: defaultProps,
    })
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toContain('peakfinder.com')
  })

  it('includes lat/lng in the URL', async () => {
    const wrapper = await mountSuspended(PeakFinderLink, {
      props: defaultProps,
    })
    const href = wrapper.find('a').attributes('href')!
    expect(href).toContain('lat=64.15')
    expect(href).toContain('lng=-21.94')
  })

  it('includes elevation and azimuth in URL', async () => {
    const wrapper = await mountSuspended(PeakFinderLink, {
      props: defaultProps,
    })
    const href = wrapper.find('a').attributes('href')!
    expect(href).toContain('ele=50')
    expect(href).toContain('azi=250')
  })

  it('encodes spot name in URL', async () => {
    const wrapper = await mountSuspended(PeakFinderLink, {
      props: { ...defaultProps, spotName: 'Snæfellsjökull Summit' },
    })
    const href = wrapper.find('a').attributes('href')!
    expect(href).toContain('name=Sn%C3%A6fellsj%C3%B6kull%20Summit')
  })

  it('opens link in new tab', async () => {
    const wrapper = await mountSuspended(PeakFinderLink, {
      props: defaultProps,
    })
    const link = wrapper.find('a')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener')
  })

  it('includes eclipse date in URL', async () => {
    const wrapper = await mountSuspended(PeakFinderLink, {
      props: defaultProps,
    })
    const href = wrapper.find('a').attributes('href')!
    expect(href).toContain('date=2026-08-12')
  })
})
