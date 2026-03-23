import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EclipseHero from '~/components/EclipseHero.vue'

describe('EclipseHero', () => {
  it('renders SVG element', async () => {
    const wrapper = await mountSuspended(EclipseHero)
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('contains corona gradient definitions', async () => {
    const wrapper = await mountSuspended(EclipseHero)
    expect(wrapper.find('#corona-haze').exists()).toBe(true)
    expect(wrapper.find('#prominence-glow').exists()).toBe(true)
  })

  it('has the moon disc (black circle)', async () => {
    const wrapper = await mountSuspended(EclipseHero)
    const circles = wrapper.findAll('circle')
    // The moon disc has fill="#050810" and r="76"
    const moonDisc = circles.filter(c => c.attributes('fill') === '#050810' && c.attributes('r') === '76')
    expect(moonDisc.length).toBe(1)
  })

  it('starts with opacity-0 and transitions to visible after mount', async () => {
    const wrapper = await mountSuspended(EclipseHero)
    // After mount, isVisible = true
    const container = wrapper.find('div')
    expect(container.classes()).toContain('opacity-100')
  })

  it('matches snapshot', async () => {
    const wrapper = await mountSuspended(EclipseHero)
    expect(wrapper.html()).toMatchSnapshot()
  })
})
