import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ForecastTimeline from '~/components/ForecastTimeline.vue'

const makeForecasts = (hours: number[]) =>
  hours.map((h) => ({
    valid_time: `2026-08-12T${String(h).padStart(2, '0')}:00:00Z`,
    cloud_cover: Math.floor(Math.random() * 100),
    precip_prob: null,
  }))

describe('ForecastTimeline', () => {
  it('renders bars for each forecast entry', async () => {
    const forecasts = makeForecasts([12, 13, 14, 15, 16, 17, 18, 19])
    const wrapper = await mountSuspended(ForecastTimeline, {
      props: { forecasts },
    })
    const bars = wrapper.findAll('.flex-1')
    expect(bars.length).toBe(8)
  })

  it('shows "no data" message when forecasts is empty', async () => {
    const wrapper = await mountSuspended(ForecastTimeline, {
      props: { forecasts: [] },
    })
    // Should render the "no data" div
    expect(wrapper.find('.text-xs').exists()).toBe(true)
  })

  it('highlights eclipse window bars (17:30-18:00 UTC)', async () => {
    const forecasts = [
      { valid_time: '2026-08-12T17:00:00Z', cloud_cover: 20, precip_prob: null },
      { valid_time: '2026-08-12T17:30:00Z', cloud_cover: 30, precip_prob: null },
      { valid_time: '2026-08-12T18:00:00Z', cloud_cover: 40, precip_prob: null },
      { valid_time: '2026-08-12T18:30:00Z', cloud_cover: 50, precip_prob: null },
    ]
    const wrapper = await mountSuspended(ForecastTimeline, {
      props: { forecasts },
    })
    // Eclipse window bars get ring-1 ring-corona/50 class
    const eclipseBars = wrapper.findAll('.ring-1')
    expect(eclipseBars.length).toBe(2) // 17:30 and 18:00
  })

  it('shows legend items (Clear, Cloudy, Overcast)', async () => {
    const forecasts = makeForecasts([12, 13, 14])
    const wrapper = await mountSuspended(ForecastTimeline, {
      props: { forecasts },
    })
    expect(wrapper.text()).toContain('Clear')
    expect(wrapper.text()).toContain('Cloudy')
    expect(wrapper.text()).toContain('Overcast')
  })

  it('colors bars by cloud cover level', async () => {
    const forecasts = [
      { valid_time: '2026-08-12T12:00:00Z', cloud_cover: 10, precip_prob: null },
      { valid_time: '2026-08-12T13:00:00Z', cloud_cover: 90, precip_prob: null },
    ]
    const wrapper = await mountSuspended(ForecastTimeline, {
      props: { forecasts },
    })
    const html = wrapper.html()
    // Green for clear, red for overcast
    expect(html).toContain('#22c55e')
    expect(html).toContain('#ef4444')
  })
})
