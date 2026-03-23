import { describe, it, expect, vi, beforeEach } from 'vitest'

let handler: any

describe('GET /api/cameras', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    global.fetch = vi.fn()
    const mod = await import('../../../server/api/cameras.get')
    handler = mod.default
  })

  it('returns cameras filtered to eclipse region', async () => {
    const apiData = [
      { Maelist_nr: 1, Myndavel: 'Borgarnes Cam', Vegheiti: 'Hringvegur', Breidd: 64.81, Lengd: -21.92, Slod: 'https://example.com/cam.jpg', Skyring: 'séð á veg' },
      { Maelist_nr: 2, Myndavel: 'Out of Range', Vegheiti: 'Road', Breidd: 60.0, Lengd: -21.0, Slod: 'url', Skyring: '' },
    ]
    ;(global.fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(apiData) })

    const result = await handler({} as any)
    expect(result.cameras).toHaveLength(1)
    expect(result.cameras[0].name).toBe('Borgarnes Cam')
    expect(result.cached).toBe(false)
  })

  it('groups images under same location ID', async () => {
    const apiData = [
      { Maelist_nr: 1, Myndavel: 'Cam', Vegheiti: 'Rd', Breidd: 65.0, Lengd: -22.0, Slod: 'a.jpg', Skyring: '' },
      { Maelist_nr: 1, Myndavel: 'Cam', Vegheiti: 'Rd', Breidd: 65.0, Lengd: -22.0, Slod: 'b.jpg', Skyring: '' },
    ]
    ;(global.fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(apiData) })

    const result = await handler({} as any)
    expect(result.cameras).toHaveLength(1)
    expect(result.cameras[0].images).toHaveLength(2)
  })

  it('returns stale cache when fetch throws', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))
    const result = await handler({} as any)

    expect(result.cameras).toEqual([])
    expect(result.cached).toBe(true)
  })
})
