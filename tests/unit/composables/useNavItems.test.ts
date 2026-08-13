import { describe, it, expect, vi } from 'vitest'

// useNavItems() calls useI18n() to resolve labels via t(). The real
// vue-i18n composable insists on being called inside a setup scope;
// mock it instead. Identity-on-key is fine — these tests assert `to`
// and `icon`, not the label text.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// useNavItems() also uses useRouteBaseName() inside `isActive` for
// locale-agnostic active-tab detection. We don't need to stub it here
// — the composable resolves it lazily inside the function, so these
// tests (which only assert on `items`) never touch it.

import { useNavItems } from '~/composables/useNavItems'

describe('useNavItems', () => {
  it('points Home at / and exposes only the surviving routes', () => {
    const { items } = useNavItems()
    expect(items.value.map(i => i.to)).toEqual(['/', '/spots', '/guide'])
  })

  it('no longer offers the retired Map tab', () => {
    const { items } = useNavItems()
    expect(items.value.find(i => i.icon === 'map')).toBeUndefined()
  })

  it('marks nothing as locked — there is nothing left to upsell', () => {
    const { items } = useNavItems()
    expect(items.value.every(i => !i.locked)).toBe(true)
  })
})
