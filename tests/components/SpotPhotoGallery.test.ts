import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SpotPhotoGallery from '~/components/SpotPhotoGallery.vue'
import type { SpotPhoto } from '~/types/spots'

const makePhoto = (filename: string, isHero = false): SpotPhoto => ({
  filename,
  alt: `Photo ${filename}`,
  credit: 'Photographer',
  license: 'unsplash',
  is_hero: isHero,
})

describe('SpotPhotoGallery', () => {
  it('renders nothing when photos array is empty', async () => {
    const wrapper = await mountSuspended(SpotPhotoGallery, {
      props: { photos: [], spotName: 'Test' },
    })
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('renders single photo layout for 1 photo', async () => {
    const photos = [makePhoto('one.webp', true)]
    const wrapper = await mountSuspended(SpotPhotoGallery, {
      props: { photos, spotName: 'Test' },
    })
    const images = wrapper.findAll('img')
    expect(images.length).toBe(1)
  })

  it('renders two photos side by side for 2 photos', async () => {
    const photos = [makePhoto('one.webp', true), makePhoto('two.webp')]
    const wrapper = await mountSuspended(SpotPhotoGallery, {
      props: { photos, spotName: 'Test' },
    })
    const images = wrapper.findAll('img')
    expect(images.length).toBe(2)
  })

  it('renders hero + 2 grid for 3+ photos', async () => {
    const photos = [
      makePhoto('one.webp', true),
      makePhoto('two.webp'),
      makePhoto('three.webp'),
    ]
    const wrapper = await mountSuspended(SpotPhotoGallery, {
      props: { photos, spotName: 'Test' },
    })
    const images = wrapper.findAll('img')
    expect(images.length).toBe(3)
  })

  it('selects hero photo by is_hero flag', async () => {
    const photos = [
      makePhoto('non-hero.webp', false),
      makePhoto('hero.webp', true),
    ]
    const wrapper = await mountSuspended(SpotPhotoGallery, {
      props: { photos, spotName: 'Test' },
    })
    // The first image rendered should be the hero
    const images = wrapper.findAll('img')
    expect(images[0].attributes('alt')).toBe('Photo hero.webp')
  })

  it('matches snapshot with 2 photos', async () => {
    const photos = [makePhoto('one.webp', true), makePhoto('two.webp')]
    const wrapper = await mountSuspended(SpotPhotoGallery, {
      props: { photos, spotName: 'Test' },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
