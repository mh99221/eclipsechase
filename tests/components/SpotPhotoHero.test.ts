import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SpotPhotoHero from '~/components/SpotPhotoHero.vue'
import type { SpotPhoto } from '~/types/spots'

const mockPhoto: SpotPhoto = {
  filename: 'test-spot.webp',
  alt: 'A beautiful Icelandic landscape',
  credit: 'Test Photographer',
  credit_url: 'https://example.com/photographer',
  license: 'unsplash',
  is_hero: true,
}

describe('SpotPhotoHero', () => {
  it('renders the hero image with correct src', async () => {
    const wrapper = await mountSuspended(SpotPhotoHero, {
      props: { photo: mockPhoto, spotName: 'Test Spot' },
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/images/spots/test-spot.webp')
  })

  it('sets alt text from photo data', async () => {
    const wrapper = await mountSuspended(SpotPhotoHero, {
      props: { photo: mockPhoto, spotName: 'Test Spot' },
    })
    const img = wrapper.find('img')
    expect(img.attributes('alt')).toBe('A beautiful Icelandic landscape')
  })

  it('generates srcset with thumb and full sizes', async () => {
    const wrapper = await mountSuspended(SpotPhotoHero, {
      props: { photo: mockPhoto, spotName: 'Test Spot' },
    })
    const img = wrapper.find('img')
    const srcset = img.attributes('srcset')
    expect(srcset).toContain('test-spot-thumb.webp 600w')
    expect(srcset).toContain('test-spot.webp 1200w')
  })

  it('defaults loading to eager', async () => {
    const wrapper = await mountSuspended(SpotPhotoHero, {
      props: { photo: mockPhoto, spotName: 'Test Spot' },
    })
    const img = wrapper.find('img')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('respects lazy loading prop', async () => {
    const wrapper = await mountSuspended(SpotPhotoHero, {
      props: { photo: mockPhoto, spotName: 'Test Spot', loading: 'lazy' },
    })
    const img = wrapper.find('img')
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('matches snapshot', async () => {
    const wrapper = await mountSuspended(SpotPhotoHero, {
      props: { photo: mockPhoto, spotName: 'Test Spot' },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
