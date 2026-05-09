import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
}))

// useNavItems() now calls useI18n() to resolve labels via t(). The
// real vue-i18n composable insists on being called inside a setup
// scope; mock it instead. Identity-on-key is fine — these tests
// assert `to` and `locked`, not the label text.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

import { useProStatus } from '~/composables/useProStatus'
import { useNavItems } from '~/composables/useNavItems'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useNavItems', () => {
  it('points Home at / for free users and marks Map locked', () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false),
      loading: ref(false),
      checkStatus: vi.fn(),
      clearPro: vi.fn(),
    } as any)

    const { items } = useNavItems()
    const home = items.value.find(i => i.icon === 'home')!
    const map = items.value.find(i => i.icon === 'map')!
    expect(home.to).toBe('/')
    expect(map.locked).toBe(true)
  })

  it('points Home at /dashboard for Pro users and Map is unlocked', () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(true),
      loading: ref(false),
      checkStatus: vi.fn(),
      clearPro: vi.fn(),
    } as any)

    const { items } = useNavItems()
    const home = items.value.find(i => i.icon === 'home')!
    const map = items.value.find(i => i.icon === 'map')!
    expect(home.to).toBe('/dashboard')
    expect(map.locked).toBeFalsy()
  })
})
