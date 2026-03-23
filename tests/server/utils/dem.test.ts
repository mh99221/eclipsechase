import { describe, it, expect } from 'vitest'
import { getElevation, isInBounds, loadDEM, type DEMMeta } from '../../../server/utils/dem'

// Minimal DEM meta covering a small area of western Iceland
const testMeta: DEMMeta = {
  minLat: 64.0,
  maxLat: 66.0,
  minLng: -24.0,
  maxLng: -20.0,
  width: 4,
  height: 4,
  cellSizeLat: (66.0 - 64.0) / 4, // 0.5 degrees per row
  cellSizeLng: (-20.0 - -24.0) / 4, // 1.0 degree per col
  rowOrder: 'south-to-north',
}

// 4x4 grid of elevation values (meters) stored row by row from south to north
// Row 0 (lat 64.0): [0, 10, 20, 30]
// Row 1 (lat 64.5): [40, 50, 60, 70]
// Row 2 (lat 65.0): [80, 90, 100, 110]
// Row 3 (lat 65.5): [120, 130, 140, 150]
const testData = new Float32Array([
  0, 10, 20, 30,
  40, 50, 60, 70,
  80, 90, 100, 110,
  120, 130, 140, 150,
])

describe('isInBounds', () => {
  it('returns true for a coordinate inside the DEM bounds', () => {
    expect(isInBounds(65.0, -22.0, testMeta)).toBe(true)
  })

  it('returns true for a coordinate at the exact boundary', () => {
    expect(isInBounds(64.0, -24.0, testMeta)).toBe(true)
    expect(isInBounds(66.0, -20.0, testMeta)).toBe(true)
  })

  it('returns false for latitude below minLat', () => {
    expect(isInBounds(63.9, -22.0, testMeta)).toBe(false)
  })

  it('returns false for latitude above maxLat', () => {
    expect(isInBounds(66.1, -22.0, testMeta)).toBe(false)
  })

  it('returns false for longitude below minLng', () => {
    expect(isInBounds(65.0, -24.5, testMeta)).toBe(false)
  })

  it('returns false for longitude above maxLng', () => {
    expect(isInBounds(65.0, -19.5, testMeta)).toBe(false)
  })

  it('returns false for coordinates clearly outside Iceland', () => {
    // Slovakia
    expect(isInBounds(48.5, 17.1, testMeta)).toBe(false)
    // North Pole
    expect(isInBounds(90.0, 0.0, testMeta)).toBe(false)
  })
})

describe('getElevation', () => {
  it('returns null for out-of-bounds coordinates', () => {
    expect(getElevation(63.0, -22.0, testData, testMeta)).toBeNull()
    expect(getElevation(65.0, -25.0, testData, testMeta)).toBeNull()
  })

  it('returns a number for in-bounds coordinates', () => {
    const elev = getElevation(65.0, -22.0, testData, testMeta)
    expect(typeof elev).toBe('number')
    expect(elev).not.toBeNull()
  })

  it('returns the exact grid value at a cell corner (south-west)', () => {
    // The bottom-left (south-west) corner maps to row 0, col 0 → value 0
    const elev = getElevation(64.0, -24.0, testData, testMeta)
    expect(elev).toBeCloseTo(0, 1)
  })

  it('interpolates between grid cells (bilinear)', () => {
    // The midpoint between row 0 col 0 (0m) and row 0 col 1 (10m) at lat 64, lng ~-23
    // col midpoint → (0 + 10) / 2 = 5m expected
    const midLng = -24.0 + testMeta.cellSizeLng * 0.5
    const elev = getElevation(64.0, midLng, testData, testMeta)
    expect(elev).toBeCloseTo(5, 0)
  })

  it('treats NaN DEM values as sea level (0m)', () => {
    const nanData = new Float32Array([NaN, NaN, NaN, NaN, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    const elev = getElevation(64.0, -24.0, nanData, testMeta)
    expect(elev).toBeCloseTo(0, 1)
  })

  it('treats very-negative DEM values as sea level (0m)', () => {
    const noDataValue = -9999
    const noDataArr = new Float32Array(16).fill(noDataValue)
    const elev = getElevation(64.0, -24.0, noDataArr, testMeta)
    expect(elev).toBeCloseTo(0, 1)
  })
})

describe('loadDEM', () => {
  it('returns an error object when DEM binary files are not present', async () => {
    // In the test environment the actual DEM binary is not committed (gitignored).
    // loadDEM caches a successful load, so if it was already loaded we get a hit;
    // otherwise it should return an error object (never throw).
    const result = await loadDEM()
    // Result is either { data, meta } or { error: string }
    expect(result).toBeDefined()
    if ('error' in result) {
      expect(typeof result.error).toBe('string')
      expect(result.error.length).toBeGreaterThan(0)
    } else {
      expect(result.data).toBeInstanceOf(Float32Array)
      expect(result.meta).toHaveProperty('width')
      expect(result.meta).toHaveProperty('height')
    }
  })

  it('never throws — always returns a result or error object', async () => {
    await expect(loadDEM()).resolves.toBeDefined()
  })
})
