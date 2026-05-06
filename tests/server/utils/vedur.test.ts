import { describe, it, expect } from 'vitest'
import { STATION_IDS, forecastsToRows, fetchForecasts, type VedurForecast } from '../../../server/utils/vedur'

describe('STATION_IDS', () => {
  it('has exactly 55 entries', () => {
    expect(STATION_IDS).toHaveLength(55)
  })

  it('contains known station IDs', () => {
    // Reykjavík
    expect(STATION_IDS).toContain('1')
    // Reykjanes
    expect(STATION_IDS).toContain('990')
    // Snæfellsnes
    expect(STATION_IDS).toContain('178')
    // Westfjords
    expect(STATION_IDS).toContain('2631')
    // Borgarfjörður
    expect(STATION_IDS).toContain('1777')
  })

  it('has no duplicate IDs', () => {
    const unique = new Set(STATION_IDS)
    expect(unique.size).toBe(STATION_IDS.length)
  })

  it('all IDs are non-empty strings', () => {
    for (const id of STATION_IDS) {
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    }
  })
})

describe('forecastsToRows', () => {
  const sampleForecasts: VedurForecast[] = [
    {
      stationId: '1',
      forecastTime: '2026-08-12T12:00:00',
      validTime: '2026-08-12T17:00:00',
      cloudCover: 30,
      temp: 13.0,
      precipitation: 0,
    },
    {
      stationId: '990',
      forecastTime: '2026-08-12T12:00:00',
      validTime: '2026-08-12T18:00:00',
      cloudCover: 70,
      temp: 11.0,
      precipitation: 0.5,
    },
  ]

  it('converts VedurForecast[] to database row shape', () => {
    const rows = forecastsToRows(sampleForecasts, '2026-08-12T12:34:56.000Z')
    expect(rows).toHaveLength(2)
    const row = rows[0]
    expect(row).toHaveProperty('station_id', '1')
    expect(row).toHaveProperty('forecast_time', '2026-08-12T12:00:00')
    expect(row).toHaveProperty('valid_time', '2026-08-12T17:00:00')
    expect(row).toHaveProperty('cloud_cover', 30)
    expect(row).toHaveProperty('precipitation_prob', 0)
    expect(row).toHaveProperty('source_model', 'vedur')
    expect(row).toHaveProperty('fetched_at', '2026-08-12T12:34:56.000Z')
  })

  it('sets source_model to "vedur" for all rows', () => {
    const rows = forecastsToRows(sampleForecasts)
    for (const row of rows) {
      expect(row.source_model).toBe('vedur')
    }
  })

  it('filters out rows with empty validTime', () => {
    const withEmpty: VedurForecast[] = [
      ...sampleForecasts,
      {
        stationId: '178',
        forecastTime: '2026-08-12T12:00:00',
        validTime: '',
        cloudCover: null,
        temp: null,
        precipitation: null,
      },
    ]
    const rows = forecastsToRows(withEmpty)
    expect(rows).toHaveLength(2)
  })

  it('preserves null cloudCover', () => {
    const forecasts: VedurForecast[] = [
      {
        stationId: '178',
        forecastTime: '2026-08-12T12:00:00',
        validTime: '2026-08-12T17:00:00',
        cloudCover: null,
        temp: 9.5,
        precipitation: 0,
      },
    ]
    const rows = forecastsToRows(forecasts)
    expect(rows[0].cloud_cover).toBeNull()
  })

  it('returns empty array for empty input', () => {
    expect(forecastsToRows([])).toEqual([])
  })
})

describe('fetchForecasts', () => {
  it('returns an array of forecasts from MSW-intercepted vedur.is', async () => {
    const forecasts = await fetchForecasts(['1', '990', '178'])
    expect(Array.isArray(forecasts)).toBe(true)
    expect(forecasts.length).toBeGreaterThan(0)
  })

  it('each forecast has expected fields', async () => {
    const forecasts = await fetchForecasts(['1'])
    expect(forecasts.length).toBeGreaterThan(0)
    const f = forecasts[0]
    expect(f).toHaveProperty('stationId')
    expect(f).toHaveProperty('forecastTime')
    expect(f).toHaveProperty('validTime')
    expect(f).toHaveProperty('cloudCover')
    expect(f).toHaveProperty('temp')
    expect(f).toHaveProperty('precipitation')
  })

  it('forecasts can have null cloudCover (no-data stations)', async () => {
    const forecasts = await fetchForecasts(['178'])
    // fixture for 178 has cloudCover: null
    const nullCloud = forecasts.find(f => f.cloudCover === null)
    expect(nullCloud).toBeDefined()
  })
})
