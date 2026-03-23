import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CountdownBar from '~/components/CountdownBar.vue'

describe('CountdownBar', () => {
  beforeEach(() => {
    // Fix time to 2026-03-23T12:00:00Z for deterministic countdown values
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-23T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders countdown units (days, hours, minutes, seconds)', async () => {
    const wrapper = await mountSuspended(CountdownBar)
    const units = wrapper.findAll('.countdown-unit')
    expect(units.length).toBe(4)
  })

  it('displays dot separators between units', async () => {
    const wrapper = await mountSuspended(CountdownBar)
    const dots = wrapper.findAll('.countdown-dot')
    expect(dots.length).toBe(3)
  })

  it('marks the first unit (days) as primary', async () => {
    const wrapper = await mountSuspended(CountdownBar)
    const primaryValues = wrapper.findAll('.countdown-value--primary')
    expect(primaryValues.length).toBe(1)
  })

  it('matches snapshot', async () => {
    const wrapper = await mountSuspended(CountdownBar)
    expect(wrapper.html()).toMatchSnapshot()
  })
})
