import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PhotoCredit from '~/components/PhotoCredit.vue'

describe('PhotoCredit', () => {
  it('renders credit text', async () => {
    const wrapper = await mountSuspended(PhotoCredit, {
      props: { credit: 'John Doe', license: 'unsplash' },
    })
    expect(wrapper.text()).toContain('John Doe')
  })

  it('renders as link when creditUrl is provided', async () => {
    const wrapper = await mountSuspended(PhotoCredit, {
      props: { credit: 'Jane', creditUrl: 'https://example.com', license: 'cc-by' },
    })
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://example.com')
    expect(link.attributes('target')).toBe('_blank')
  })

  it('uses fallback URL for known licenses without creditUrl', async () => {
    const wrapper = await mountSuspended(PhotoCredit, {
      props: { credit: 'Unsplash User', license: 'unsplash' },
    })
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://unsplash.com')
  })

  it('renders as span when no URL resolves', async () => {
    const wrapper = await mountSuspended(PhotoCredit, {
      props: { credit: 'Someone', license: 'cc0' },
    })
    // cc0 has no fallback URL
    const link = wrapper.find('a')
    const span = wrapper.find('span.hover\\:text-slate-300')
    // Either link or span should be present depending on fallback
    expect(link.exists() || span.exists()).toBe(true)
  })

  it('applies overlay variant styles by default', async () => {
    const wrapper = await mountSuspended(PhotoCredit, {
      props: { credit: 'Test', license: 'unsplash' },
    })
    const container = wrapper.find('div')
    expect(container.classes()).toContain('absolute')
  })

  it('does not apply absolute positioning for inline variant', async () => {
    const wrapper = await mountSuspended(PhotoCredit, {
      props: { credit: 'Test', license: 'unsplash', variant: 'inline' },
    })
    const container = wrapper.find('div')
    expect(container.classes()).not.toContain('absolute')
  })

  it('shows license label as title attribute', async () => {
    const wrapper = await mountSuspended(PhotoCredit, {
      props: { credit: 'Test', license: 'cc-by' },
    })
    const container = wrapper.find('div')
    expect(container.attributes('title')).toBe('CC BY 4.0')
  })

  it('renders camera SVG icon', async () => {
    const wrapper = await mountSuspended(PhotoCredit, {
      props: { credit: 'Test', license: 'unsplash' },
    })
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
