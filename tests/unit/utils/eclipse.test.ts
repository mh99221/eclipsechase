import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  cloudColor,
  cloudLevel,
  compassDirection,
  weatherSvgHtml,
  CLOUD_COVER_LEVELS,
  CLOUD_COVER_NO_DATA,
  HORIZON_VERDICT_COLORS,
  REGION_LABELS,
  SPOT_TYPE_LABELS,
} from '../../../app/utils/eclipse'

describe('formatDuration', () => {
  it('formats seconds only when under 60s', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(1)).toBe('1s')
    expect(formatDuration(59)).toBe('59s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(60)).toBe('1m 0s')
    expect(formatDuration(61)).toBe('1m 1s')
    expect(formatDuration(90)).toBe('1m 30s')
    expect(formatDuration(135)).toBe('2m 15s')
    expect(formatDuration(3600)).toBe('60m 0s')
  })

  it('handles totality-typical durations', () => {
    // ~2m15s eclipse totality
    expect(formatDuration(135)).toBe('2m 15s')
    expect(formatDuration(140)).toBe('2m 20s')
  })
})

describe('cloudColor', () => {
  it('returns no-data color for null', () => {
    expect(cloudColor(null)).toBe(CLOUD_COVER_NO_DATA.color)
  })

  it('returns no-data color for undefined', () => {
    expect(cloudColor(undefined)).toBe(CLOUD_COVER_NO_DATA.color)
  })

  it('returns clear color at 0%', () => {
    expect(cloudColor(0)).toBe(CLOUD_COVER_LEVELS[0].color)
  })

  it('returns clear color at 20% boundary', () => {
    expect(cloudColor(20)).toBe(CLOUD_COVER_LEVELS[0].color)
  })

  it('returns mostly-clear color at 21%', () => {
    expect(cloudColor(21)).toBe(CLOUD_COVER_LEVELS[1].color)
  })

  it('returns mostly-clear color at 40% boundary', () => {
    expect(cloudColor(40)).toBe(CLOUD_COVER_LEVELS[1].color)
  })

  it('returns partly-cloudy color at 41%', () => {
    expect(cloudColor(41)).toBe(CLOUD_COVER_LEVELS[2].color)
  })

  it('returns partly-cloudy color at 60% boundary', () => {
    expect(cloudColor(60)).toBe(CLOUD_COVER_LEVELS[2].color)
  })

  it('returns mostly-cloudy color at 80% boundary', () => {
    expect(cloudColor(80)).toBe(CLOUD_COVER_LEVELS[3].color)
  })

  it('returns overcast color at 100%', () => {
    expect(cloudColor(100)).toBe(CLOUD_COVER_LEVELS[4].color)
  })

  it('returns last level color for values > 100', () => {
    expect(cloudColor(110)).toBe(CLOUD_COVER_LEVELS[CLOUD_COVER_LEVELS.length - 1].color)
  })
})

describe('cloudLevel', () => {
  it('returns no-data for null', () => {
    expect(cloudLevel(null)).toEqual(CLOUD_COVER_NO_DATA)
  })

  it('returns no-data for undefined', () => {
    expect(cloudLevel(undefined)).toEqual(CLOUD_COVER_NO_DATA)
  })

  it('returns Clear level at 0', () => {
    const level = cloudLevel(0)
    expect(level.label).toBe('Clear')
  })

  it('returns Mostly clear level at 30', () => {
    const level = cloudLevel(30)
    expect(level.label).toBe('Mostly clear')
  })

  it('returns Partly cloudy level at 50', () => {
    const level = cloudLevel(50)
    expect(level.label).toBe('Partly cloudy')
  })

  it('returns Mostly cloudy level at 70', () => {
    const level = cloudLevel(70)
    expect(level.label).toBe('Mostly cloudy')
  })

  it('returns Overcast level at 100', () => {
    const level = cloudLevel(100)
    expect(level.label).toBe('Overcast')
  })

  it('returns both color and label', () => {
    const level = cloudLevel(10)
    expect(level).toHaveProperty('color')
    expect(level).toHaveProperty('label')
  })
})

describe('compassDirection', () => {
  const cases: Array<[number, string]> = [
    [0, 'N'],
    [22.5, 'NNE'],
    [45, 'NE'],
    [67.5, 'ENE'],
    [90, 'E'],
    [112.5, 'ESE'],
    [135, 'SE'],
    [157.5, 'SSE'],
    [180, 'S'],
    [202.5, 'SSW'],
    [225, 'SW'],
    [247.5, 'WSW'],
    [270, 'W'],
    [292.5, 'WNW'],
    [315, 'NW'],
    [337.5, 'NNW'],
    [360, 'N'],
  ]

  it.each(cases)('returns %s for azimuth %i°', (azimuth, expected) => {
    expect(compassDirection(azimuth)).toBe(expected)
  })

  it('handles eclipse sun azimuth ~250° (WSW)', () => {
    expect(compassDirection(250)).toBe('WSW')
  })

  it('handles near-boundary values', () => {
    expect(compassDirection(11)).toBe('N')
    expect(compassDirection(12)).toBe('NNE')
  })
})

describe('weatherSvgHtml', () => {
  it('returns SVG string', () => {
    const svg = weatherSvgHtml(0)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('returns no-data SVG for null', () => {
    const svg = weatherSvgHtml(null)
    expect(svg).toContain('<svg')
    expect(svg).toContain('?')
  })

  it('returns no-data SVG for undefined', () => {
    const svg = weatherSvgHtml(undefined)
    expect(svg).toContain('?')
  })

  it('returns sun SVG for clear (0%)', () => {
    const svg = weatherSvgHtml(0)
    // Sun has a circle + rays (lines)
    expect(svg).toContain('<circle')
    expect(svg).toContain('<line')
  })

  it('returns sun SVG for clear at 20%', () => {
    const svg = weatherSvgHtml(20)
    expect(svg).toContain('<circle')
    expect(svg).toContain('<line')
  })

  it('returns sun+cloud SVG for mostly clear (30%)', () => {
    const svg = weatherSvgHtml(30)
    expect(svg).toContain('<path')
    expect(svg).toContain('<circle')
  })

  it('returns cloud SVG for overcast (100%)', () => {
    const svg = weatherSvgHtml(100)
    expect(svg).toContain('<path')
    // Overcast has rain streaks
    expect(svg).toContain('<line')
  })

  it('respects custom size parameter', () => {
    const svg = weatherSvgHtml(0, 48)
    expect(svg).toContain('width="48"')
    expect(svg).toContain('height="48"')
  })

  it('uses default size of 36', () => {
    const svg = weatherSvgHtml(50)
    expect(svg).toContain('width="36"')
    expect(svg).toContain('height="36"')
  })
})

describe('CLOUD_COVER_LEVELS', () => {
  it('has 5 levels', () => {
    expect(CLOUD_COVER_LEVELS).toHaveLength(5)
  })

  it('levels are in ascending order', () => {
    for (let i = 1; i < CLOUD_COVER_LEVELS.length; i++) {
      expect(CLOUD_COVER_LEVELS[i].max).toBeGreaterThan(CLOUD_COVER_LEVELS[i - 1].max)
    }
  })

  it('last level max is 100', () => {
    expect(CLOUD_COVER_LEVELS[CLOUD_COVER_LEVELS.length - 1].max).toBe(100)
  })
})

describe('HORIZON_VERDICT_COLORS', () => {
  it('has all four verdicts', () => {
    expect(HORIZON_VERDICT_COLORS).toHaveProperty('clear')
    expect(HORIZON_VERDICT_COLORS).toHaveProperty('marginal')
    expect(HORIZON_VERDICT_COLORS).toHaveProperty('risky')
    expect(HORIZON_VERDICT_COLORS).toHaveProperty('blocked')
  })

  it('clear is green', () => {
    expect(HORIZON_VERDICT_COLORS.clear).toBe('#22c55e')
  })

  it('blocked is red', () => {
    expect(HORIZON_VERDICT_COLORS.blocked).toBe('#ef4444')
  })
})

describe('REGION_LABELS', () => {
  it('has all five regions', () => {
    expect(REGION_LABELS).toHaveProperty('westfjords')
    expect(REGION_LABELS).toHaveProperty('snaefellsnes')
    expect(REGION_LABELS).toHaveProperty('reykjanes')
    expect(REGION_LABELS).toHaveProperty('reykjavik')
    expect(REGION_LABELS).toHaveProperty('borgarfjordur')
  })
})

describe('SPOT_TYPE_LABELS', () => {
  it('has all spot types', () => {
    expect(SPOT_TYPE_LABELS).toHaveProperty('drive-up')
    expect(SPOT_TYPE_LABELS).toHaveProperty('short-walk')
    expect(SPOT_TYPE_LABELS).toHaveProperty('moderate-hike')
    expect(SPOT_TYPE_LABELS).toHaveProperty('serious-hike')
  })
})
