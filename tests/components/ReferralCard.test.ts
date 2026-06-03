import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ReferralCard from '~/components/ReferralCard.vue'

// $fetch is the global used by the component's onMounted call.
vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
  code: 'ABCD2345', link: 'https://eclipsechase.is/pro?ref=ABCD2345',
  joined_count: 1, earned_eur: 4, pending_count: 0,
}))

describe('ReferralCard', () => {
  it('renders the referral link after load', async () => {
    const wrapper = await mountSuspended(ReferralCard)
    // allow the onMounted fetch microtask to resolve
    await new Promise(r => setTimeout(r, 0))
    expect(wrapper.html()).toContain('ABCD2345')
  })
})
