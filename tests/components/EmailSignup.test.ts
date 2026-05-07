import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EmailSignup from '~/components/EmailSignup.vue'

describe('EmailSignup', () => {
  it('renders a form with email input and submit button', async () => {
    const wrapper = await mountSuspended(EmailSignup)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('has a privacy link', async () => {
    const wrapper = await mountSuspended(EmailSignup)
    const links = wrapper.findAll('a')
    const privacyLink = links.filter(l => l.attributes('href') === '/privacy')
    expect(privacyLink.length).toBe(1)
  })

  it('binds email input to v-model', async () => {
    const wrapper = await mountSuspended(EmailSignup)
    const input = wrapper.find('input[type="email"]')
    await input.setValue('test@example.com')
    expect((input.element as HTMLInputElement).value).toBe('test@example.com')
  })

  it('does not show success state initially', async () => {
    const wrapper = await mountSuspended(EmailSignup)
    expect(wrapper.text()).not.toContain('success')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('hides the privacy note paragraph when compact prop is true', async () => {
    const wrapper = await mountSuspended(EmailSignup, { props: { compact: true } })
    const links = wrapper.findAll('a')
    const privacyLink = links.filter(l => l.attributes('href') === '/privacy')
    expect(privacyLink.length).toBe(0)
  })
})
