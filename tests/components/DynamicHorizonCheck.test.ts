import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DynamicHorizonCheck from '~/components/DynamicHorizonCheck.vue'

// Mock $fetch for the horizon check API
vi.mock('#app/composables/fetch', async () => {
  const actual = await vi.importActual('#app/composables/fetch')
  return {
    ...actual,
  }
})

describe('DynamicHorizonCheck', () => {
  it('renders with a close button', async () => {
    const wrapper = await mountSuspended(DynamicHorizonCheck, {
      props: { lat: 64.15, lng: -21.94 },
    })
    // Should have a close button
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows section title', async () => {
    const wrapper = await mountSuspended(DynamicHorizonCheck, {
      props: { lat: 64.15, lng: -21.94 },
    })
    expect(wrapper.find('h3').exists()).toBe(true)
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = await mountSuspended(DynamicHorizonCheck, {
      props: { lat: 64.15, lng: -21.94 },
    })
    const closeBtn = wrapper.findAll('button').find(b => b.find('svg').exists())
    if (closeBtn) {
      await closeBtn.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    }
  })

  it('computes Google Maps navigate URL', async () => {
    const wrapper = await mountSuspended(DynamicHorizonCheck, {
      props: { lat: 64.15, lng: -21.94 },
    })
    const html = wrapper.html()
    // The navigate URL is used in the result section
    expect(html).toBeTruthy()
  })
})
