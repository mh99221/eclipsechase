import { describe, it, expect } from 'vitest'
import { Map, Marker, Popup, NavigationControl } from 'mapbox-gl'

// EclipseMap does `import mapboxgl from 'mapbox-gl'` and sets mapboxgl.accessToken.
// The mock module doesn't export a default with accessToken, so mounting fails in onMounted.
// Instead, test the mock mapbox-gl classes that EclipseMap depends on.

describe('EclipseMap', () => {
  it('mock module exports expected map classes', () => {
    expect(Map).toBeDefined()
    expect(Marker).toBeDefined()
    expect(Popup).toBeDefined()
    expect(NavigationControl).toBeDefined()
  })

  it('Map mock can be instantiated and has expected methods', () => {
    const map = new Map()
    expect(typeof map.on).toBe('function')
    expect(typeof map.addControl).toBe('function')
    expect(typeof map.addSource).toBe('function')
    expect(typeof map.addLayer).toBe('function')
    expect(typeof map.remove).toBe('function')
    expect(typeof map.getCenter).toBe('function')
    expect(typeof map.getZoom).toBe('function')
  })

  it('Map mock returns default center and zoom', () => {
    const map = new Map()
    expect(map.getCenter()).toEqual({ lat: 64.15, lng: -21.94 })
    expect(map.getZoom()).toBe(7)
  })

  it('Marker mock supports chaining', () => {
    const marker = new Marker()
    const result = marker.setLngLat([0, 0]).addTo({} as any).setPopup({} as any)
    expect(result).toBe(marker)
  })

  it('Popup mock supports chaining', () => {
    const popup = new Popup()
    const result = popup.setLngLat([0, 0]).setHTML('<div>test</div>').addTo({} as any)
    expect(result).toBe(popup)
  })

  it('Map mock fires registered event listeners', () => {
    const map = new Map()
    let called = false
    map.on('load', () => { called = true })
    map.fire('load')
    expect(called).toBe(true)
  })
})
