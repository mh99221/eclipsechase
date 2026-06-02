import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HomePersonaRanker from '~/components/HomePersonaRanker.vue'

// vue-i18n + NuxtLinkLocale are stubbed globally in tests/mocks/setup.ts.
// This locks the per-profile orderings that mirror useRecommendation.ts
// weights — the teaser is hand-encoded, so a drift here means the landing
// no longer matches the real engine's behaviour.

interface CardSnapshot {
  slug: string
  filtered: boolean
  reason: string | null
}

function readCards(wrapper: Awaited<ReturnType<typeof mountSuspended>>): CardSnapshot[] {
  return wrapper.findAll('[data-testid^="persona-card-"]').map((c) => {
    const reasonEl = c.find('.persona-reason')
    return {
      slug: (c.attributes('data-testid') ?? '').replace('persona-card-', ''),
      filtered: c.classes().includes('persona-card-filtered'),
      reason: reasonEl.exists() ? reasonEl.text() : null,
    }
  })
}

async function selectProfile(
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  id: string,
) {
  await wrapper.find(`[data-testid="persona-chip-${id}"]`).trigger('click')
  await nextTick()
}

describe('HomePersonaRanker', () => {
  it('renders the First-Timer order by default with nothing filtered', async () => {
    const wrapper = await mountSuspended(HomePersonaRanker)
    const cards = readCards(wrapper)
    expect(cards.map(c => c.slug)).toEqual(['gardur', 'kirkjufell', 'sandafell'])
    expect(cards.every(c => !c.filtered)).toBe(true)
  })

  it('ranks longest-totality first for the Photographer, nothing filtered', async () => {
    const wrapper = await mountSuspended(HomePersonaRanker)
    await selectProfile(wrapper, 'photographer')
    const cards = readCards(wrapper)
    expect(cards.map(c => c.slug)).toEqual(['kirkjufell', 'sandafell', 'gardur'])
    expect(cards.every(c => !c.filtered)).toBe(true)
  })

  it('filters the drive-up spot for the Hiker and promotes the hike', async () => {
    const wrapper = await mountSuspended(HomePersonaRanker)
    await selectProfile(wrapper, 'hiker')
    const cards = readCards(wrapper)
    // Survivors ranked first (hike leads), filtered card last.
    expect(cards.map(c => c.slug)).toEqual(['sandafell', 'kirkjufell', 'gardur'])
    const gardur = cards.find(c => c.slug === 'gardur')!
    expect(gardur.filtered).toBe(true)
    expect(gardur.reason).toBe('Roadside — no hike')
    expect(cards.filter(c => c.filtered)).toHaveLength(1)
  })

  it('filters the serviceless spot for the Family', async () => {
    const wrapper = await mountSuspended(HomePersonaRanker)
    await selectProfile(wrapper, 'family')
    const cards = readCards(wrapper)
    expect(cards.map(c => c.slug)).toEqual(['gardur', 'kirkjufell', 'sandafell'])
    const sandafell = cards.find(c => c.slug === 'sandafell')!
    expect(sandafell.filtered).toBe(true)
    expect(sandafell.reason).toBe('No services')
    expect(cards.filter(c => c.filtered)).toHaveLength(1)
  })

  it('never filters Kirkjufell — it survives every profile', async () => {
    const wrapper = await mountSuspended(HomePersonaRanker)
    for (const id of ['firsttimer', 'photographer', 'skychaser', 'hiker', 'family']) {
      await selectProfile(wrapper, id)
      const kirkjufell = readCards(wrapper).find(c => c.slug === 'kirkjufell')!
      expect(kirkjufell, `kirkjufell missing for ${id}`).toBeTruthy()
      expect(kirkjufell.filtered, `kirkjufell filtered for ${id}`).toBe(false)
    }
  })

  it('toggling Hiker ↔ Family flips Garður between #1-eligible and filtered', async () => {
    const wrapper = await mountSuspended(HomePersonaRanker)

    await selectProfile(wrapper, 'hiker')
    expect(readCards(wrapper).find(c => c.slug === 'gardur')!.filtered).toBe(true)

    await selectProfile(wrapper, 'family')
    const afterFamily = readCards(wrapper)
    expect(afterFamily.find(c => c.slug === 'gardur')!.filtered).toBe(false)
    expect(afterFamily[0].slug).toBe('gardur')
  })
})
