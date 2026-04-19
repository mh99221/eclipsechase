import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Load the real grid.json for the test — small enough (~135 KB)
const gridPath = join(process.cwd(), 'public', 'eclipse-data', 'grid.json')
const raw = JSON.parse(readFileSync(gridPath, 'utf-8'))

// Mock fs to return the real file so the loader finds it
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: () => true,
    readFileSync: (p: string, enc?: string) => actual.readFileSync(gridPath, enc ?? 'utf-8'),
  }
})

describe('eclipseGrid', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('findNearestEclipsePoint returns a point near Reykjavik', async () => {
    const { loadEclipseGrid, findNearestEclipsePoint } = await import(
      '../../../server/utils/eclipseGrid'
    )
    const grid = await loadEclipseGrid()
    const match = findNearestEclipsePoint(grid, 64.15, -21.94)
    expect(match).not.toBeNull()
    expect(match!.point.totality_start).toMatch(/^2026-08-12T17:/)
    expect(match!.point.lat).toBeGreaterThan(63)
    expect(match!.point.lat).toBeLessThan(65)
  })

  it('findNearestEclipsePoint returns null for coordinates far from Iceland', async () => {
    const { loadEclipseGrid, findNearestEclipsePoint } = await import(
      '../../../server/utils/eclipseGrid'
    )
    const grid = await loadEclipseGrid()
    const match = findNearestEclipsePoint(grid, 0, 0)
    expect(match).toBeNull()
  })

  it('caches the grid across calls', async () => {
    const { loadEclipseGrid } = await import('../../../server/utils/eclipseGrid')
    const g1 = await loadEclipseGrid()
    const g2 = await loadEclipseGrid()
    expect(g1).toBe(g2)
  })
})
