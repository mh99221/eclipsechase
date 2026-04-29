import { describe, it, expect } from 'vitest'
import { ref } from 'vue'

// Pure threshold logic — no Nuxt context needed because we pass an
// explicit `now` ref, which short-circuits the runtime route/config
// hooks inside the composable.

describe('useForecastPhase', () => {
  it('exports ECLIPSE_DATE pinned to 2026-08-12T17:43:00Z', async () => {
    const { ECLIPSE_DATE } = await import(
      '../../../app/composables/useForecastPhase'
    )
    expect(ECLIPSE_DATE.toISOString()).toBe('2026-08-12T17:43:00.000Z')
  })

  // Edge cases: 1 minute either side of each phase boundary, plus the
  // user-relevant "today" anchor and the eclipse instant itself.
  // Boundary semantics: `d > THRESHOLD` for the looser-data side, so AT
  // exactly d == THRESHOLD we tip into the tighter phase.
  it.each([
    ['climatology', '2026-04-29T00:00:00.000Z', 'today (T-105)'],
    ['climatology', '2026-07-13T17:42:00.000Z', 'T-30 + 1 min (loose side)'],
    ['subseasonal', '2026-07-13T17:44:00.000Z', 'T-30 - 1 min (tight side)'],
    ['subseasonal', '2026-07-28T17:42:00.000Z', 'T-15 + 1 min'],
    ['extended',    '2026-07-28T17:44:00.000Z', 'T-15 - 1 min'],
    ['extended',    '2026-08-05T17:42:00.000Z', 'T-7 + 1 min'],
    ['reliable',    '2026-08-05T17:44:00.000Z', 'T-7 - 1 min'],
    ['reliable',    '2026-08-11T17:42:00.000Z', 'T-1 + 1 min'],
    ['nowcast',     '2026-08-11T17:44:00.000Z', 'T-1 - 1 min'],
    ['nowcast',     '2026-08-12T17:00:00.000Z', '43 min before totality'],
    ['nowcast',     '2026-08-12T17:43:00.000Z', 'eclipse instant'],
  ])('phase = %s at %s (%s)', async (expected, isoDate, _label) => {
    const { useForecastPhase } = await import(
      '../../../app/composables/useForecastPhase'
    )
    const now = ref(new Date(isoDate))
    const { phase } = useForecastPhase(now)
    expect(phase.value).toBe(expected)
  })

  it('reports daysUntil with sub-day precision', async () => {
    const { useForecastPhase } = await import(
      '../../../app/composables/useForecastPhase'
    )
    // 12 h before eclipse instant → 0.5 days
    const now = ref(new Date('2026-08-12T05:43:00.000Z'))
    const { daysUntil } = useForecastPhase(now)
    expect(daysUntil.value).toBeCloseTo(0.5, 5)
  })

  it('isPreview is always false when an explicit now is passed', async () => {
    const { useForecastPhase } = await import(
      '../../../app/composables/useForecastPhase'
    )
    const now = ref(new Date('2026-08-05T17:00:00.000Z'))
    const { isPreview } = useForecastPhase(now)
    expect(isPreview.value).toBe(false)
  })

  it('phase + daysUntil react to changes in the input ref', async () => {
    const { useForecastPhase } = await import(
      '../../../app/composables/useForecastPhase'
    )
    const now = ref(new Date('2026-04-29T00:00:00.000Z'))
    const { phase } = useForecastPhase(now)
    expect(phase.value).toBe('climatology')

    // Move to T-7 territory; phase should follow.
    now.value = new Date('2026-08-08T00:00:00.000Z')
    expect(phase.value).toBe('reliable')
  })
})
