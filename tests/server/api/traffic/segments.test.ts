import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetchRoadSegments = vi.fn()
let handler: any

describe('GET /api/traffic/segments', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    vi.doMock('../../../../server/utils/vegagerdin', () => ({
      fetchRoadSegments: (...args: any[]) => mockFetchRoadSegments(...args),
    }))

    const mod = await import('../../../../server/api/traffic/segments.get')
    handler = mod.default
  })

  it('returns segments from fetchRoadSegments', async () => {
    const segments = [{ roadName: 'R1', sectionName: 'S', condition: 'good', description: 'OK', updatedAt: '2026-08-12T14:00:00Z' }]
    mockFetchRoadSegments.mockResolvedValue(segments)
    const result = await handler({} as any)

    expect(result.segments).toEqual(segments)
    expect(result.cached).toBe(false)
  })

  it('returns cached segments on second call within TTL', async () => {
    const segments = [{ roadName: 'R1', sectionName: 'S', condition: 'good', description: 'OK', updatedAt: '2026-08-12T14:00:00Z' }]
    mockFetchRoadSegments.mockResolvedValue(segments)
    await handler({} as any)
    const result = await handler({} as any)

    expect(result.cached).toBe(true)
    expect(mockFetchRoadSegments).toHaveBeenCalledTimes(1)
  })

  it('returns empty segments when fetch fails and no cache', async () => {
    mockFetchRoadSegments.mockRejectedValue(new Error('Network error'))
    const result = await handler({} as any)

    expect(result.segments).toEqual([])
    expect(result.cached).toBe(true)
  })
})
