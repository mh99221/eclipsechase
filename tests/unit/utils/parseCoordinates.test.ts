import { describe, it, expect } from 'vitest'
import { parseCoordinates, isValidIcelandCoord } from '../../../app/utils/parseCoordinates'

describe('parseCoordinates', () => {
  // Reference point: Bíldudalur Harbour (Westfjords)
  const lat = 65.68554
  const lng = -23.59498

  describe('decimal pair (bare)', () => {
    it('parses comma-separated', () => {
      expect(parseCoordinates('65.68554, -23.59498')).toEqual({ lat, lng })
    })
    it('parses comma without space', () => {
      expect(parseCoordinates('65.68554,-23.59498')).toEqual({ lat, lng })
    })
    it('parses space-separated', () => {
      expect(parseCoordinates('65.68554 -23.59498')).toEqual({ lat, lng })
    })
    it('parses tab-separated', () => {
      expect(parseCoordinates('65.68554\t-23.59498')).toEqual({ lat, lng })
    })
    it('parses with semicolon', () => {
      expect(parseCoordinates('65.68554;-23.59498')).toEqual({ lat, lng })
    })
  })

  describe('hemisphere markers', () => {
    it('parses suffix N/W', () => {
      const r = parseCoordinates('65.68554°N, 23.59498°W')
      expect(r).toEqual({ lat, lng })
    })
    it('parses prefix N/W', () => {
      const r = parseCoordinates('N65.68554, W23.59498')
      expect(r).toEqual({ lat, lng })
    })
    it('parses without degree symbol', () => {
      const r = parseCoordinates('65.68554N, 23.59498W')
      expect(r).toEqual({ lat, lng })
    })
  })

  describe('Google Maps URLs', () => {
    it('parses @lat,lng form', () => {
      const r = parseCoordinates('https://www.google.com/maps/@65.68554,-23.59498,15z')
      expect(r).toEqual({ lat, lng })
    })
    it('parses place URL with @coords', () => {
      const r = parseCoordinates('https://www.google.com/maps/place/Iceland/@65.68554,-23.59498,15z')
      expect(r).toEqual({ lat, lng })
    })
    it('parses ?q= query form', () => {
      const r = parseCoordinates('https://maps.google.com/?q=65.68554,-23.59498')
      expect(r).toEqual({ lat, lng })
    })
  })

  describe('Apple Maps URLs', () => {
    it('parses ll= form', () => {
      const r = parseCoordinates('https://maps.apple.com/?ll=65.68554,-23.59498')
      expect(r).toEqual({ lat, lng })
    })
  })

  describe('swap heuristic', () => {
    it('swaps if user pasted lng,lat in GeoJSON order', () => {
      // -23.59498, 65.68554 (lng first) should swap to (lat, lng)
      const r = parseCoordinates('-23.59498, 65.68554')
      expect(r).toEqual({ lat, lng })
    })
  })

  describe('errors', () => {
    it('rejects empty input', () => {
      expect(parseCoordinates('')).toEqual({ error: 'unparseable' })
    })
    it('rejects gibberish', () => {
      expect(parseCoordinates('not coordinates at all')).toEqual({ error: 'unparseable' })
    })
    it('rejects coords outside Iceland', () => {
      expect(parseCoordinates('40.7128, -74.0060')).toEqual({ error: 'outside_iceland' })
    })
    it('rejects single number', () => {
      expect(parseCoordinates('65.68554')).toEqual({ error: 'unparseable' })
    })
  })

  describe('isValidIcelandCoord', () => {
    it('accepts coords inside the bbox', () => {
      expect(isValidIcelandCoord(65, -22)).toBe(true)
      expect(isValidIcelandCoord(63.0, -25.0)).toBe(true)
      expect(isValidIcelandCoord(67.5, -13.0)).toBe(true)
    })
    it('rejects coords outside the bbox', () => {
      expect(isValidIcelandCoord(40, -74)).toBe(false)
      expect(isValidIcelandCoord(70, -20)).toBe(false)
      expect(isValidIcelandCoord(65, -10)).toBe(false)
    })
    it('rejects NaN', () => {
      expect(isValidIcelandCoord(NaN, -20)).toBe(false)
      expect(isValidIcelandCoord(65, NaN)).toBe(false)
    })
  })
})
