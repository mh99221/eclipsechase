import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BottomNav from '~/components/BottomNav.vue'

describe('BottomNav', () => {
  it('renders the surviving tabs', async () => {
    const wrapper = await mountSuspended(BottomNav)
    expect(wrapper.find('nav.bottom-nav').exists()).toBe(true)
    expect(wrapper.findAll('.bottom-nav-item')).toHaveLength(3)
  })

  it('does not offer the retired map tab', async () => {
    const wrapper = await mountSuspended(BottomNav)
    expect(wrapper.html()).not.toContain('/map')
  })

  it('renders no lock indicator — nothing is gated any more', async () => {
    const wrapper = await mountSuspended(BottomNav)
    expect(wrapper.find('[data-testid="nav-lock-map"]').exists()).toBe(false)
  })
})
