import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Starfield from '~/components/Starfield.vue'

describe('Starfield', () => {
  it('renders 120 star elements', async () => {
    const wrapper = await mountSuspended(Starfield)
    const stars = wrapper.findAll('.absolute.rounded-full')
    expect(stars.length).toBe(120)
  })

  it('is aria-hidden', async () => {
    const wrapper = await mountSuspended(Starfield)
    const container = wrapper.find('div')
    expect(container.attributes('aria-hidden')).toBe('true')
  })

  it('uses pointer-events-none on the container', async () => {
    const wrapper = await mountSuspended(Starfield)
    const container = wrapper.find('div')
    expect(container.classes()).toContain('pointer-events-none')
  })

  it('generates deterministic stars (same positions on each render)', async () => {
    const wrapper1 = await mountSuspended(Starfield)
    const wrapper2 = await mountSuspended(Starfield)
    expect(wrapper1.html()).toBe(wrapper2.html())
  })

  it('matches snapshot', async () => {
    const wrapper = await mountSuspended(Starfield)
    expect(wrapper.html()).toMatchSnapshot()
  })
})
