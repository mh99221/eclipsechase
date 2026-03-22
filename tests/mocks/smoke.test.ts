/**
 * Smoke test to verify MSW handlers, fixtures, and factories load correctly.
 * This file can be removed once real tests exist.
 */
import { describe, it, expect } from 'vitest'
import { handlers, buildObservationsXml, buildForecastsXml } from './handlers'
import weatherObs from './fixtures/weather-observations.json'
import weatherForecasts from './fixtures/weather-forecasts.json'
import viewingSpots from './fixtures/viewing-spots.json'
import eclipseGrid from './fixtures/eclipse-grid.json'
import horizonGrid from './fixtures/horizon-grid.json'
import stripeSession from './fixtures/stripe-session.json'
import roadConditions from './fixtures/road-conditions.json'
import { createSpot, resetSpotCounter } from './factories/spot'
import { createStation, resetStationCounter } from './factories/station'
import { createPurchase, resetPurchaseCounter } from './factories/purchase'

describe('MSW handlers', () => {
  it('exports a non-empty handlers array', () => {
    expect(handlers.length).toBeGreaterThan(0)
  })
})

describe('Fixtures', () => {
  it('weather-observations has 6 entries with one null temp', () => {
    expect(weatherObs).toHaveLength(6)
    expect(weatherObs.some((o) => o.temp === null)).toBe(true)
  })

  it('weather-forecasts has 6 entries with one null cloudCover', () => {
    expect(weatherForecasts).toHaveLength(6)
    expect(weatherForecasts.some((f) => f.cloudCover === null)).toBe(true)
  })

  it('viewing-spots has 5 entries with varying completeness', () => {
    expect(viewingSpots).toHaveLength(5)
    // One with empty photos
    expect(viewingSpots.some((s) => Array.isArray(s.photos) && s.photos.length === 0)).toBe(true)
    // One with null horizon_check
    expect(viewingSpots.some((s) => s.horizon_check === null)).toBe(true)
    // One fully populated
    expect(viewingSpots.some((s) => s.horizon_check !== null && s.photos.length > 0)).toBe(true)
  })

  it('eclipse-grid has 5 points with one outside totality', () => {
    expect(eclipseGrid).toHaveLength(5)
    expect(eclipseGrid.some((p) => p.totality_start === null)).toBe(true)
  })

  it('horizon-grid has 3 points', () => {
    expect(horizonGrid).toHaveLength(3)
    expect(horizonGrid.some((p) => p.verdict === 'clear')).toBe(true)
    expect(horizonGrid.some((p) => p.verdict === 'blocked')).toBe(true)
  })

  it('stripe-session has expected shape', () => {
    expect(stripeSession.type).toBe('checkout.session.completed')
    expect(stripeSession.data.object.metadata.product).toBe('eclipse_pro_2026')
  })

  it('road-conditions has 7 entries with varied conditions', () => {
    expect(roadConditions).toHaveLength(7)
    const conditions = roadConditions.map((r) => r.condition)
    expect(conditions).toContain('good')
    expect(conditions).toContain('difficult')
    expect(conditions).toContain('closed')
  })
})

describe('XML builders', () => {
  it('buildObservationsXml produces valid XML with station tags', () => {
    const xml = buildObservationsXml(weatherObs)
    expect(xml).toContain('<observations>')
    expect(xml).toContain('<station id="1"')
    expect(xml).toContain('<name>Reykjavík</name>')
    expect(xml).toContain('<T>12.5</T>')
    // Station with null temp should not have <T> tag
    expect(xml).toContain('<station id="1777"')
    const borgarnesSection = xml.split('id="1777"')[1].split('</station>')[0]
    expect(borgarnesSection).not.toContain('<T>')
  })

  it('buildForecastsXml produces valid XML with nested forecasts', () => {
    const xml = buildForecastsXml(weatherForecasts)
    expect(xml).toContain('<forecasts>')
    expect(xml).toContain('<station id="1"')
    expect(xml).toContain('<forecast>')
    expect(xml).toContain('<ftime>')
    expect(xml).toContain('<N>30</N>')
    // Station 178 has null cloudCover — no <N> tag in that forecast
    const station178Section = xml.split('id="178"')[1].split('</station>')[0]
    expect(station178Section).not.toContain('<N>')
  })
})

describe('Factories', () => {
  it('createSpot generates unique spots with incrementing IDs', () => {
    resetSpotCounter()
    const s1 = createSpot()
    const s2 = createSpot()
    expect(s1.id).toBe('spot-test-1')
    expect(s2.id).toBe('spot-test-2')
    expect(s1.slug).not.toBe(s2.slug)
  })

  it('createSpot accepts overrides', () => {
    resetSpotCounter()
    const s = createSpot({ name: 'Custom Spot', region: 'westfjords' })
    expect(s.name).toBe('Custom Spot')
    expect(s.region).toBe('westfjords')
    expect(s.id).toBe('spot-test-1')
  })

  it('createStation generates unique stations', () => {
    resetStationCounter()
    const st1 = createStation()
    const st2 = createStation()
    expect(st1.id).toBe('1001')
    expect(st2.id).toBe('1002')
  })

  it('createStation accepts overrides', () => {
    resetStationCounter()
    const st = createStation({ name: 'Custom Station', region: 'westfjords' })
    expect(st.name).toBe('Custom Station')
    expect(st.region).toBe('westfjords')
  })

  it('createPurchase generates unique purchases', () => {
    resetPurchaseCounter()
    const p1 = createPurchase()
    const p2 = createPurchase()
    expect(p1.id).toBe(1)
    expect(p2.id).toBe(2)
    expect(p1.stripe_session_id).not.toBe(p2.stripe_session_id)
  })

  it('createPurchase accepts overrides', () => {
    resetPurchaseCounter()
    const p = createPurchase({ email: 'custom@test.com', is_active: false })
    expect(p.email).toBe('custom@test.com')
    expect(p.is_active).toBe(false)
  })
})
