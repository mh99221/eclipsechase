import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MapEclipseUnavailable from '~/components/map/MapEclipseUnavailable.vue'

describe('MapEclipseUnavailable', () => {
  it('explains that the eclipse-day forecast is not available yet', async () => {
    const wrapper = await mountSuspended(MapEclipseUnavailable)
    expect(wrapper.text()).toContain('48 hours before totality')
  })

  it('is announced to assistive tech as a status', async () => {
    const wrapper = await mountSuspended(MapEclipseUnavailable)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('emits show-now so the user can get back to usable data', async () => {
    const wrapper = await mountSuspended(MapEclipseUnavailable)
    await wrapper.find('button.cta').trigger('click')
    expect(wrapper.emitted('show-now')).toHaveLength(1)
  })
})
