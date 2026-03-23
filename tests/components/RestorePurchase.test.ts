import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RestorePurchase from '~/components/RestorePurchase.vue'

describe('RestorePurchase', () => {
  it('shows idle state with restore link initially', async () => {
    const wrapper = await mountSuspended(RestorePurchase)
    expect(wrapper.text()).toContain('Already purchased')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('transitions to email input on clicking restore link', async () => {
    const wrapper = await mountSuspended(RestorePurchase)
    const restoreBtn = wrapper.find('button')
    await restoreBtn.trigger('click')
    // Should now show email input
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Restore Purchase')
  })

  it('shows Send Code button in email input state', async () => {
    const wrapper = await mountSuspended(RestorePurchase)
    await wrapper.find('button').trigger('click')
    const buttons = wrapper.findAll('button')
    const sendBtn = buttons.find(b => b.text().includes('Send Code'))
    expect(sendBtn).toBeTruthy()
  })

  it('has placeholder text on email input', async () => {
    const wrapper = await mountSuspended(RestorePurchase)
    await wrapper.find('button').trigger('click')
    const input = wrapper.find('input[type="email"]')
    expect(input.attributes('placeholder')).toBe('you@example.com')
  })
})
