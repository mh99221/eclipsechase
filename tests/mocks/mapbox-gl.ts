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
  _element: HTMLElement = document.createElement('div')
  setLngLat() { return this }
  addTo() { return this }
  remove() { return this }
  getElement() { return this._element }
  setPopup() { return this }
}
export class LngLatBounds {
  extend() { return this }
  isEmpty() { return false }
}
