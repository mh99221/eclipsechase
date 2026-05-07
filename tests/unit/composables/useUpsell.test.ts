import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUpsell } from '~/composables/useUpsell'

const sessionStore = new Map<string, string>()

beforeEach(() => {
  sessionStore.clear()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => sessionStore.get(k) ?? null,
    setItem: (k: string, v: string) => { sessionStore.set(k, v) },
    removeItem: (k: string) => { sessionStore.delete(k) },
    clear: () => sessionStore.clear(),
  })
  // useState singletons leak across tests — reset by re-importing.
  vi.resetModules()
})

describe('useUpsell', () => {
  it('opens and closes the sheet', () => {
    const { openUpsell, closeUpsell, isOpen } = useUpsell()
    expect(isOpen.value).toBe(false)
    openUpsell({ source: 'tile' })
    expect(isOpen.value).toBe(true)
    closeUpsell()
    expect(isOpen.value).toBe(false)
  })

  it('nav-source open is suppressed after dismissal in same session', () => {
    const { openUpsell, closeUpsell, isOpen } = useUpsell()
    openUpsell({ source: 'nav' })
    expect(isOpen.value).toBe(true)
    closeUpsell()
    openUpsell({ source: 'nav' })
    expect(isOpen.value).toBe(false)
  })

  it('tile-source open ignores dismissal flag', () => {
    const { openUpsell, closeUpsell, isOpen } = useUpsell()
    openUpsell({ source: 'nav' })
    closeUpsell()
    openUpsell({ source: 'tile' })
    expect(isOpen.value).toBe(true)
  })
})
