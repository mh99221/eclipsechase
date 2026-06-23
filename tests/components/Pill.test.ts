import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Pill from '~/components/ui/Pill.vue'

describe('Pill', () => {
  it('exposes aria-pressed as a toggle button by default', async () => {
    const wrapper = await mountSuspended(Pill, { props: { active: true } })
    const btn = wrapper.find('button.pill')
    expect(btn.attributes('aria-pressed')).toBe('true')
  })

  it('defaults aria-pressed to false when inactive', async () => {
    const wrapper = await mountSuspended(Pill, { props: { active: false } })
    expect(wrapper.find('button.pill').attributes('aria-pressed')).toBe('false')
  })

  it('drops aria-pressed when a role is overridden (e.g. tabs)', async () => {
    // DetailTabs reuses Pill as role="tab" + aria-selected. aria-pressed is
    // invalid on the tab role and must not be emitted (aria-allowed-attr).
    const wrapper = await mountSuspended(Pill, {
      props: { active: true },
      attrs: { role: 'tab', 'aria-selected': 'true' },
    })
    const btn = wrapper.find('button.pill')
    expect(btn.attributes('role')).toBe('tab')
    expect(btn.attributes('aria-pressed')).toBeUndefined()
  })
})
