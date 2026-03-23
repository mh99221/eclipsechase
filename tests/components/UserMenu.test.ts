import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UserMenu from '~/components/UserMenu.vue'

// Mock useProStatus to control isPro state
vi.mock('~/composables/useProStatus', () => ({
  useProStatus: () => ({
    isPro: ref(true),
    loading: ref(false),
    clearPro: vi.fn(() => Promise.resolve()),
  }),
}))

describe('UserMenu', () => {
  it('renders when user is Pro', async () => {
    const wrapper = await mountSuspended(UserMenu)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('shows logout button', async () => {
    const wrapper = await mountSuspended(UserMenu)
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
  })

  it('shows Pro badge text on desktop', async () => {
    const wrapper = await mountSuspended(UserMenu)
    // The Pro badge has class 'hidden sm:inline'
    const badge = wrapper.find('span.hidden')
    expect(badge.exists()).toBe(true)
  })
})
