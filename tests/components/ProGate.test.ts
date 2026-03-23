import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProGate from '~/components/ProGate.vue'

// We need to control isPro externally
const mockIsPro = ref(false)
const mockLoading = ref(false)

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: () => ({
    isPro: mockIsPro,
    loading: mockLoading,
    activate: vi.fn(),
    clearPro: vi.fn(),
  }),
}))

describe('ProGate', () => {
  beforeEach(() => {
    mockIsPro.value = false
    mockLoading.value = false
  })

  it('shows slot content when user is Pro', async () => {
    mockIsPro.value = true
    const wrapper = await mountSuspended(ProGate, {
      slots: {
        default: '<div class="pro-content">Pro Content Here</div>',
      },
    })
    expect(wrapper.find('.pro-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Pro Content Here')
  })

  it('shows upgrade prompt when user is not Pro', async () => {
    mockIsPro.value = false
    const wrapper = await mountSuspended(ProGate)
    expect(wrapper.text()).toContain('Eclipse Pro')
    expect(wrapper.text()).toContain('One-time payment')
  })

  it('shows loading skeleton when checking Pro status', async () => {
    mockLoading.value = true
    mockIsPro.value = false
    const wrapper = await mountSuspended(ProGate)
    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
  })

  it('does not show slot content when not Pro', async () => {
    mockIsPro.value = false
    const wrapper = await mountSuspended(ProGate, {
      slots: {
        default: '<div class="pro-content">Hidden</div>',
      },
    })
    expect(wrapper.find('.pro-content').exists()).toBe(false)
  })
})
