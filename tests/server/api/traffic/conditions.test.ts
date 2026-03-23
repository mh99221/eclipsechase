import { describe, it, expect, vi, beforeEach } from 'vitest'
import roadConditionsFixture from '../../../mocks/fixtures/road-conditions.json'

const mockFetchRoadConditions = vi.fn()
let handler: any

describe('GET /api/traffic/conditions', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    vi.doMock('../../../../server/utils/vegagerdin', () => ({
      fetchRoadConditions: (...args: any[]) => mockFetchRoadConditions(...args),
    }))

    const mod = await import('../../../../server/api/traffic/conditions.get')
    handler = mod.default
  })

  it('returns conditions from fetchRoadConditions', async () => {
    mockFetchRoadConditions.mockResolvedValue(roadConditionsFixture)
    const result = await handler({} as any)

    expect(result.conditions).toEqual(roadConditionsFixture)
    expect(result.cached).toBe(false)
    expect(result.fetchedAt).toBeTruthy()
  })

  it('returns cached data on second call within TTL', async () => {
    mockFetchRoadConditions.mockResolvedValue(roadConditionsFixture)
    await handler({} as any)
    const result = await handler({} as any)

    expect(result.cached).toBe(true)
    expect(mockFetchRoadConditions).toHaveBeenCalledTimes(1)
  })

  it('returns empty conditions on first fetch returning empty', async () => {
    mockFetchRoadConditions.mockResolvedValue([])
    const result = await handler({} as any)

    expect(result.conditions).toEqual([])
    expect(result.cached).toBe(false)
  })
})
