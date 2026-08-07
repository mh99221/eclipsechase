import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MapChipStack from '~/components/map/MapChipStack.vue'

const baseProps = {
  selectedProfile: null,
  showWeather: true,
  showTraffic: false,
  showCameras: false,
  weatherMode: 'now' as const,
}

/** Pills in the forecast-mode row (the third `.row`). */
function modeRow(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  const rows = wrapper.findAll('.row')
  return rows[rows.length - 1]!
}

describe('MapChipStack — forecast mode row', () => {
  it('renders a NOW and an ECLIPSE DAY pill', async () => {
    const wrapper = await mountSuspended(MapChipStack, { props: baseProps })
    const labels = modeRow(wrapper).findAll('button.pill').map(b => b.text())
    expect(labels).toEqual(['NOW', 'ECLIPSE DAY'])
  })

  it('marks NOW active when weatherMode is now', async () => {
    const wrapper = await mountSuspended(MapChipStack, { props: baseProps })
    const pills = modeRow(wrapper).findAll('button.pill')
    expect(pills[0]!.attributes('aria-pressed')).toBe('true')
    expect(pills[1]!.attributes('aria-pressed')).toBe('false')
  })

  it('marks ECLIPSE DAY active when weatherMode is eclipse', async () => {
    const wrapper = await mountSuspended(MapChipStack, {
      props: { ...baseProps, weatherMode: 'eclipse' as const },
    })
    const pills = modeRow(wrapper).findAll('button.pill')
    expect(pills[0]!.attributes('aria-pressed')).toBe('false')
    expect(pills[1]!.attributes('aria-pressed')).toBe('true')
  })

  it('emits update:weatherMode with the clicked mode', async () => {
    const wrapper = await mountSuspended(MapChipStack, { props: baseProps })
    const pills = modeRow(wrapper).findAll('button.pill')

    await pills[1]!.trigger('click')
    await pills[0]!.trigger('click')

    expect(wrapper.emitted('update:weatherMode')).toEqual([['eclipse'], ['now']])
  })

  it('still renders the mode row when the weather layer is toggled off', async () => {
    // The row is intentionally not gated on showWeather — the now/eclipse
    // distinction should stay discoverable either way.
    const wrapper = await mountSuspended(MapChipStack, {
      props: { ...baseProps, showWeather: false },
    })
    expect(modeRow(wrapper).findAll('button.pill').map(b => b.text()))
      .toEqual(['NOW', 'ECLIPSE DAY'])
  })

  it('omits the mode row in profiles-only mode', async () => {
    const wrapper = await mountSuspended(MapChipStack, {
      props: { ...baseProps, rows: 'profiles' as const },
    })
    const texts = wrapper.findAll('button.pill').map(b => b.text())
    expect(texts).not.toContain('ECLIPSE DAY')
    expect(texts).not.toContain('NOW')
  })
})
