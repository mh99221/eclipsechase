import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HorizonBadge from '~/components/HorizonBadge.vue'

describe('HorizonBadge', () => {
  it('renders clear verdict in full mode', async () => {
    const wrapper = await mountSuspended(HorizonBadge, {
      props: { verdict: 'clear', clearance: 8.5 },
    })
    // Full mode shows description with clearance
    expect(wrapper.find('div').exists()).toBe(true)
    expect(wrapper.html()).toContain('8.5')
  })

  it('renders blocked verdict', async () => {
    const wrapper = await mountSuspended(HorizonBadge, {
      props: { verdict: 'blocked', clearance: -3.2 },
    })
    expect(wrapper.html()).toContain('3.2')
  })

  it('renders compact mode with colored dot', async () => {
    const wrapper = await mountSuspended(HorizonBadge, {
      props: { verdict: 'clear', clearance: 8.5, compact: true },
    })
    const dot = wrapper.find('span.w-2')
    expect(dot.exists()).toBe(true)
    // Should have green color for clear
    expect(dot.attributes('style')).toContain('#22c55e')
  })

  it('uses correct color for marginal verdict', async () => {
    const wrapper = await mountSuspended(HorizonBadge, {
      props: { verdict: 'marginal', clearance: 2.1, compact: true },
    })
    const dot = wrapper.find('span.w-2')
    expect(dot.attributes('style')).toContain('#eab308')
  })

  it('uses correct color for risky verdict', async () => {
    const wrapper = await mountSuspended(HorizonBadge, {
      props: { verdict: 'risky', clearance: 0.5, compact: true },
    })
    const dot = wrapper.find('span.w-2')
    expect(dot.attributes('style')).toContain('#f97316')
  })

  it('uses correct color for blocked verdict', async () => {
    const wrapper = await mountSuspended(HorizonBadge, {
      props: { verdict: 'blocked', clearance: -2.0, compact: true },
    })
    const dot = wrapper.find('span.w-2')
    expect(dot.attributes('style')).toContain('#ef4444')
  })

  it('renders full mode with bg and border classes', async () => {
    const wrapper = await mountSuspended(HorizonBadge, {
      props: { verdict: 'clear', clearance: 8.5 },
    })
    const container = wrapper.find('div')
    expect(container.classes()).toContain('bg-green-500/10')
    expect(container.classes()).toContain('border-green-500/30')
  })
})
