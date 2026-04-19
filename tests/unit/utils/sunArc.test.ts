import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { attachSunArc } from '../../../app/utils/sunArc'

function makeMap() {
  const layers: string[] = []
  const sources: string[] = []
  // Stable source stubs keyed by id so spy references remain valid across calls
  const sourceStubs: Record<string, { setData: ReturnType<typeof vi.fn> }> = {}
  return {
    _zoom: 7,
    _zoomHandlers: [] as Array<() => void>,
    project(lnglat: any) {
      const lng = Array.isArray(lnglat) ? lnglat[0] : lnglat.lng
      const lat = Array.isArray(lnglat) ? lnglat[1] : lnglat.lat
      return { x: lng * 100, y: -lat * 100 }
    },
    unproject(point: any) {
      const x = Array.isArray(point) ? point[0] : point.x
      const y = Array.isArray(point) ? point[1] : point.y
      return { lng: x / 100, lat: -y / 100 }
    },
    getZoom() { return this._zoom },
    on(event: string, fn: () => void) {
      if (event === 'zoom') this._zoomHandlers.push(fn)
    },
    off: vi.fn(),
    addSource: vi.fn((id: string) => {
      sources.push(id)
      sourceStubs[id] = { setData: vi.fn() }
    }),
    removeSource: vi.fn((id: string) => { sources.splice(sources.indexOf(id), 1) }),
    addLayer: vi.fn((spec: { id: string }) => { layers.push(spec.id) }),
    removeLayer: vi.fn((id: string) => { layers.splice(layers.indexOf(id), 1) }),
    getSource(id: string) { return sources.includes(id) ? sourceStubs[id] : undefined },
    getLayer(id: string) { return layers.includes(id) ? {} : undefined },
    fireZoom(newZoom: number) { this._zoom = newZoom; for (const h of this._zoomHandlers) h() },
  }
}

const VALID_PROPS = {
  lat: 64.15, lng: -21.94,
  sunAzimuth: 250, sunAltitude: 24,
  totalityStartIso: '2026-08-12T17:45:00Z',
  id: 'test-1',
}

describe('attachSunArc', () => {
  afterEach(() => {
    // Clean up any markers the Mapbox mock appended to document.body
    document.querySelectorAll(
      '.sun-arc-sun, .sun-arc-tick, .sun-arc-callout',
    ).forEach(el => el.remove())
  })

  it('adds a geojson source and line layer with the expected ids', () => {
    const map = makeMap()
    attachSunArc(map as any, VALID_PROPS)
    expect(map.addSource).toHaveBeenCalledWith('sun-arc-test-1', expect.any(Object))
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'sun-arc-line-test-1' }))
  })

  it('registers a zoom handler', () => {
    const map = makeMap()
    attachSunArc(map as any, VALID_PROPS)
    expect(map._zoomHandlers).toHaveLength(1)
  })

  it('detach() removes source, layer, and unregisters zoom handler', () => {
    const map = makeMap()
    const detach = attachSunArc(map as any, VALID_PROPS)
    detach()
    expect(map.removeLayer).toHaveBeenCalledWith('sun-arc-line-test-1')
    expect(map.removeSource).toHaveBeenCalledWith('sun-arc-test-1')
    expect(map.off).toHaveBeenCalledWith('zoom', expect.any(Function))
  })

  it('creates HTML markers for sun disk + 6 ticks + 1 callout (totality tick replaced by disk)', () => {
    const map = makeMap()
    attachSunArc(map as any, VALID_PROPS)
    // Markers append DOM elements to document.body via Mapbox (mocked).
    // Count the elements by class.
    const sun = document.querySelectorAll('.sun-arc-sun')
    const ticks = document.querySelectorAll('.sun-arc-tick')
    const callouts = document.querySelectorAll('.sun-arc-callout')
    expect(sun).toHaveLength(1)
    expect(ticks).toHaveLength(6)  // 17:30, 17:35, 17:40, 17:50, 17:55, 18:00
    expect(callouts).toHaveLength(1)
  })

  it('zoom event triggers geojson source reload via setData', () => {
    const map = makeMap()
    attachSunArc(map as any, VALID_PROPS)
    const source = map.getSource('sun-arc-test-1') as any
    map.fireZoom(9)
    expect(source.setData).toHaveBeenCalled()
  })

  it('noop detach() is safe to call twice', () => {
    const map = makeMap()
    const detach = attachSunArc(map as any, VALID_PROPS)
    detach()
    expect(() => detach()).not.toThrow()
  })
})
