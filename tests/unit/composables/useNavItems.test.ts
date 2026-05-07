import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
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
