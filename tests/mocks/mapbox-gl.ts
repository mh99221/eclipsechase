export class Map {
  _listeners: Record<string, Function[]> = {}
  constructor(_options?: any) {}
  on(event: string, fn: Function) { (this._listeners[event] ??= []).push(fn); return this }
  off() { return this }
  once(event: string, fn: Function) { this.on(event, fn); return this }
  addSource() {}
  addLayer() {}
  removeLayer() {}
  removeSource() {}
  getSource() { return undefined }
  getLayer() { return undefined }
  addControl() {}
  removeControl() {}
  setLayoutProperty() {}
  setPaintProperty() {}
  fitBounds() {}
  flyTo() {}
  setCenter() {}
  setZoom() {}
  getCenter() { return { lat: 64.15, lng: -21.94 } }
  getZoom() { return 7 }
  getCanvas() { return { style: {} } as any }
  getContainer() { return document.createElement('div') }
  remove() {}
  resize() {}
  loaded() { return true }
  fire(event: string) { this._listeners[event]?.forEach(fn => fn()); return this }
  // Simple deterministic projection for tests: 1° = 100 pixels around
  // the current center. Good enough to verify arc geometry.
  project(lnglat: [number, number] | { lng: number; lat: number }) {
    const c = this.getCenter()
    const lng = Array.isArray(lnglat) ? lnglat[0] : lnglat.lng
    const lat = Array.isArray(lnglat) ? lnglat[1] : lnglat.lat
    return { x: (lng - c.lng) * 100, y: -(lat - c.lat) * 100 }
  }
  unproject(point: [number, number] | { x: number; y: number }) {
    const c = this.getCenter()
    const x = Array.isArray(point) ? point[0] : point.x
    const y = Array.isArray(point) ? point[1] : point.y
    return { lng: c.lng + x / 100, lat: c.lat - y / 100 }
  }
}

export class NavigationControl { constructor(_options?: any) {} }
export class GeolocateControl { constructor(_options?: any) {} on() { return this } }
export class ScaleControl { constructor(_options?: any) {} }
export class Popup {
  setLngLat() { return this }
  setHTML() { return this }
  setDOMContent() { return this }
  addTo() { return this }
  remove() { return this }
  on() { return this }
}
export class Marker {
  _element: HTMLElement
  constructor(options?: { element?: HTMLElement; anchor?: string } | null) {
    this._element = options?.element ?? document.createElement('div')
  }
  setLngLat() { return this }
  addTo(_map: any) { document.body.appendChild(this._element); return this }
  remove() { this._element.remove(); return this }
  getElement() { return this._element }
  setPopup() { return this }
}
export class LngLatBounds {
  extend() { return this }
  isEmpty() { return false }
}

// Default export mirrors the real mapbox-gl module so `import mapboxgl from 'mapbox-gl'`
// and `mapboxgl.Marker` / `mapboxgl.accessToken` work in tests.
const mapboxgl = {
  Map,
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
  ScaleControl,
  LngLatBounds,
  accessToken: '',
}
export default mapboxgl
