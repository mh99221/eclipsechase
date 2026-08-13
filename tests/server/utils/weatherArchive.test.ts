import { describe, it, expect } from 'vitest'
import {
  ECLIPSE_DAY,
  CAPTURED_AT,
  getAllStations,
  getStation,
  getStationTimeline,
  getAllTimelines,
  getTotalityCloudCover,
  windowAroundTotality,
} from '../../../server/utils/weatherArchive'

describe('weatherArchive', () => {
  it('exposes the eclipse day and capture instant', () => {
    expect(ECLIPSE_DAY).toBe('2026-08-12')
    expect(Number.isNaN(Date.parse(CAPTURED_AT))).toBe(false)
  })

  it('returns every archived station with coordinates', () => {
    const stations = getAllStations()
    expect(stations.length).toBeGreaterThan(0)
    for (const s of stations) {
      expect(typeof s.id).toBe('string')
      expect(typeof s.lat).toBe('number')
      expect(typeof s.lng).toBe('number')
      expect(typeof s.name).toBe('string')
    }
  })

  it('finds a station by id and returns null for an unknown one', () => {
    const id = getAllStations()[0]!.id
    expect(getStation(id)?.id).toBe(id)
    expect(getStation('no-such-station')).toBeNull()
  })

  it('returns a defensive copy of stations', () => {
    const first = getAllStations()[0]!
    const originalName = first.name
    first.name = 'MUTATED'
    expect(getAllStations()[0]!.name).toBe(originalName)
  })

  it('returns an eclipse-day timeline per station, ascending and de-duplicated', () => {
    const id = getAllTimelines()[0]!.id
    const slots = getStationTimeline(id)
    expect(slots.length).toBeGreaterThan(0)

    const times = slots.map(s => s.valid_time)
    expect(times).toEqual([...times].sort())
    expect(new Set(times).size).toBe(times.length)

    for (const slot of slots) {
      expect(slot.valid_time.startsWith(ECLIPSE_DAY)).toBe(true)
    }
  })

  it('returns an empty timeline for an unknown station rather than throwing', () => {
    expect(getStationTimeline('no-such-station')).toEqual([])
  })

  it('returns defensive copies of timeline slots', () => {
    const id = getAllTimelines()[0]!.id
    const slot = getStationTimeline(id)[0]!
    const original = slot.cloud_cover
    slot.cloud_cover = -999
    expect(getStationTimeline(id)[0]!.cloud_cover).toBe(original)
  })

  it('joins station metadata onto every timeline', () => {
    const timelines = getAllTimelines()
    expect(timelines.length).toBeGreaterThan(0)
    for (const t of timelines) {
      expect(t.forecasts.length).toBeGreaterThan(0)
      expect(typeof t.name).toBe('string')
      expect(typeof t.lat).toBe('number')
    }
  })

  it('gives a totality-window cloud reading per station', () => {
    const rows = getTotalityCloudCover()
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(typeof row.station_id).toBe('string')
      expect(row.cloud_cover).not.toBeNull()
      // The snapshot's hourly slots put the nearest reading to C2 (17:43Z)
      // inside the 17:00–18:00Z window.
      expect(row.forecast_valid_at! >= `${ECLIPSE_DAY}T17:00`).toBe(true)
      expect(row.forecast_valid_at! <= `${ECLIPSE_DAY}T18:00:01`).toBe(true)
    }
  })

  it('returns defensive copies of the totality readings', () => {
    const original = getTotalityCloudCover()[0]!.cloud_cover
    getTotalityCloudCover()[0]!.cloud_cover = -999
    expect(getTotalityCloudCover()[0]!.cloud_cover).toBe(original)
  })

  it('windows a timeline around totality without inventing slots', () => {
    const id = getAllTimelines()[0]!.id
    const full = getStationTimeline(id)

    const short = windowAroundTotality(full, 12)
    expect(short.length).toBeLessThanOrEqual(12)
    expect(short.length).toBeGreaterThan(0)
    // Every returned slot must come from the archive.
    for (const slot of short) {
      expect(full.some(f => f.valid_time === slot.valid_time)).toBe(true)
    }
    // A window wider than the archived day returns the whole day, never more.
    expect(windowAroundTotality(full, 48)).toHaveLength(full.length)
  })
})
