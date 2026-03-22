import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addEclipsePathLayers } from '../../../app/utils/mapLayers'

/**
 * mapbox-gl is aliased to tests/mocks/mapbox-gl.ts in vitest.config.ts.
 * We create a mock map object with vi.fn() spies on addSource/addLayer/getSource
 * to verify the correct calls are made.
 */

function createMockMap(sourceExists = false) {
  return {
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getSource: vi.fn().mockReturnValue(sourceExists ? {} : undefined),
    removeSource: vi.fn(),
    removeLayer: vi.fn(),
  }
}

describe('addEclipsePathLayers', () => {
  let map: ReturnType<typeof createMockMap>

  beforeEach(() => {
    map = createMockMap()
  })

  it('calls addSource with eclipse-path source', () => {
    addEclipsePathLayers(map as any)
    expect(map.addSource).toHaveBeenCalledOnce()
    expect(map.addSource).toHaveBeenCalledWith('eclipse-path', expect.objectContaining({
      type: 'geojson',
      data: '/eclipse-data/path.geojson',
    }))
  })

  it('adds exactly 3 layers', () => {
    addEclipsePathLayers(map as any)
    expect(map.addLayer).toHaveBeenCalledTimes(3)
  })

  it('adds totality-fill layer', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const fillLayer = calls.find((l: any) => l.id === 'totality-fill')
    expect(fillLayer).toBeDefined()
    expect(fillLayer.type).toBe('fill')
    expect(fillLayer.source).toBe('eclipse-path')
  })

  it('adds totality-border layer', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const borderLayer = calls.find((l: any) => l.id === 'totality-border')
    expect(borderLayer).toBeDefined()
    expect(borderLayer.type).toBe('line')
    expect(borderLayer.source).toBe('eclipse-path')
  })

  it('adds centerline layer', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const centerlineLayer = calls.find((l: any) => l.id === 'centerline')
    expect(centerlineLayer).toBeDefined()
    expect(centerlineLayer.type).toBe('line')
    expect(centerlineLayer.source).toBe('eclipse-path')
  })

  it('uses amber color #f59e0b for totality fill', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const fillLayer = calls.find((l: any) => l.id === 'totality-fill')
    expect(fillLayer.paint['fill-color']).toBe('#f59e0b')
  })

  it('uses bright amber #fbbf24 for centerline', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const centerlineLayer = calls.find((l: any) => l.id === 'centerline')
    expect(centerlineLayer.paint['line-color']).toBe('#fbbf24')
  })

  it('uses default borderWidth of 1.5', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const borderLayer = calls.find((l: any) => l.id === 'totality-border')
    expect(borderLayer.paint['line-width']).toBe(1.5)
  })

  it('uses default centerlineOpacity of 0.6', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const centerlineLayer = calls.find((l: any) => l.id === 'centerline')
    expect(centerlineLayer.paint['line-opacity']).toBe(0.6)
  })

  it('respects custom borderWidth option', () => {
    addEclipsePathLayers(map as any, { borderWidth: 3 })
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const borderLayer = calls.find((l: any) => l.id === 'totality-border')
    expect(borderLayer.paint['line-width']).toBe(3)
  })

  it('respects custom centerlineOpacity option', () => {
    addEclipsePathLayers(map as any, { centerlineOpacity: 0.9 })
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const centerlineLayer = calls.find((l: any) => l.id === 'centerline')
    expect(centerlineLayer.paint['line-opacity']).toBe(0.9)
  })

  it('totality-border has dasharray pattern', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const borderLayer = calls.find((l: any) => l.id === 'totality-border')
    expect(borderLayer.paint['line-dasharray']).toEqual([4, 3])
  })

  it('all layers filter on eclipse-path source', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    for (const layer of calls) {
      expect(layer.source).toBe('eclipse-path')
    }
  })

  it('totality layers filter by totality_path type', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const fillLayer = calls.find((l: any) => l.id === 'totality-fill')
    const borderLayer = calls.find((l: any) => l.id === 'totality-border')
    expect(fillLayer.filter).toEqual(['==', ['get', 'type'], 'totality_path'])
    expect(borderLayer.filter).toEqual(['==', ['get', 'type'], 'totality_path'])
  })

  it('centerline layer filters by centerline type', () => {
    addEclipsePathLayers(map as any)
    const calls = map.addLayer.mock.calls.map((c: any[]) => c[0])
    const centerlineLayer = calls.find((l: any) => l.id === 'centerline')
    expect(centerlineLayer.filter).toEqual(['==', ['get', 'type'], 'centerline'])
  })
})
