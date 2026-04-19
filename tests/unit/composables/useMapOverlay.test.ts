import { describe, it, expect, beforeEach, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { useMapOverlay } from '../../../app/composables/useMapOverlay'

// Flush the microtask queue. The composable's activate() chains at
// least 2 awaits (fetch + onActivate), plus the outer watcher pushes
// the callback onto its own scheduler tick.
async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

// The shared mapbox-gl mock (tests/mocks/mapbox-gl.ts) provides Map and
// Marker with empty impls. We augment them here with spies so we can
// assert add/remove + zoom-handler lifecycle.

interface Item { id: string; lat: number; lng: number }

function makeMap() {
  let zoom = 7
  return {
    on: vi.fn(),
    off: vi.fn(),
    getZoom: vi.fn(() => zoom),
    setZoom(z: number) { zoom = z },
  }
}

function makeMarker() {
  return {
    remove: vi.fn(),
    getElement: vi.fn(() => document.createElement('div')),
  }
}

describe('useMapOverlay', () => {
  let map: ReturnType<typeof makeMap>
  let mapRef: { map: any }

  beforeEach(() => {
    map = makeMap()
    mapRef = { map }
  })

  it('fetches data once on first activation', async () => {
    const fetchData = vi.fn(async () => [{ id: 'a', lat: 64, lng: -21 }] as Item[])
    const buildMarker = vi.fn(() => makeMarker() as any)
    const active = ref(false)

    effectScope().run(() => {
      useMapOverlay<Item>({
        active,
        mapRef: ref(mapRef) as any,
        fetchData,
        buildMarker,
      })
    })

    active.value = true
    await flush()
    await flush()

    expect(fetchData).toHaveBeenCalledTimes(1)
    expect(buildMarker).toHaveBeenCalledTimes(1)
  })

  it('does not re-fetch on subsequent re-activations', async () => {
    const fetchData = vi.fn(async () => [
      { id: 'a', lat: 64, lng: -21 },
      { id: 'b', lat: 65, lng: -22 },
    ] as Item[])
    const buildMarker = vi.fn(() => makeMarker() as any)
    const active = ref(false)

    effectScope().run(() => {
      useMapOverlay<Item>({
        active,
        mapRef: ref(mapRef) as any,
        fetchData,
        buildMarker,
      })
    })

    active.value = true
    await flush()
    active.value = false
    await flush()
    active.value = true
    await flush()
    active.value = false
    await flush()
    active.value = true
    await flush()

    expect(fetchData).toHaveBeenCalledTimes(1)
    expect(buildMarker).toHaveBeenCalledTimes(6) // 2 items × 3 activations
  })

  it('removes all markers and unregisters the zoom handler on deactivate', async () => {
    const items: Item[] = [
      { id: 'a', lat: 64, lng: -21 },
      { id: 'b', lat: 65, lng: -22 },
      { id: 'c', lat: 66, lng: -23 },
    ]
    const markers = items.map(() => makeMarker())
    let buildIdx = 0
    const buildMarker = vi.fn(() => markers[buildIdx++]! as any)
    const active = ref(false)

    effectScope().run(() => {
      useMapOverlay<Item>({
        active,
        mapRef: ref(mapRef) as any,
        fetchData: async () => items,
        buildMarker,
      })
    })

    active.value = true
    await flush()

    expect(map.on).toHaveBeenCalledWith('zoom', expect.any(Function))
    const [, zoomHandler] = map.on.mock.calls.at(-1)!

    active.value = false
    await flush()

    for (const m of markers) {
      expect(m.remove).toHaveBeenCalledTimes(1)
    }
    expect(map.off).toHaveBeenCalledWith('zoom', zoomHandler)
  })

  it('fires onActivate / onDeactivate alongside marker lifecycle', async () => {
    const onActivate = vi.fn()
    const onDeactivate = vi.fn()
    const active = ref(false)

    effectScope().run(() => {
      useMapOverlay<Item>({
        active,
        mapRef: ref(mapRef) as any,
        fetchData: async () => [{ id: 'a', lat: 64, lng: -21 }],
        buildMarker: () => makeMarker() as any,
        onActivate,
        onDeactivate,
      })
    })

    active.value = true
    await flush()
    expect(onActivate).toHaveBeenCalledTimes(1)
    expect(onDeactivate).not.toHaveBeenCalled()

    active.value = false
    await flush()
    expect(onDeactivate).toHaveBeenCalledTimes(1)
  })

  it('cleans up on scope dispose while active', async () => {
    const items: Item[] = [{ id: 'a', lat: 64, lng: -21 }]
    const marker = makeMarker()
    const buildMarker = vi.fn(() => marker as any)
    const active = ref(true)

    const scope = effectScope()
    scope.run(() => {
      useMapOverlay<Item>({
        active,
        mapRef: ref(mapRef) as any,
        fetchData: async () => items,
        buildMarker,
      })
    })

    // Let the initial watch-triggered activation settle.
    active.value = false
    await flush()
    active.value = true
    await flush()

    scope.stop()

    expect(marker.remove).toHaveBeenCalled()
  })
})
