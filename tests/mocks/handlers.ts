import { http, HttpResponse } from 'msw'
import weatherObs from './fixtures/weather-observations.json'
import weatherForecasts from './fixtures/weather-forecasts.json'
import viewingSpots from './fixtures/viewing-spots.json'
import roadConditions from './fixtures/road-conditions.json'

// ---------------------------------------------------------------------------
// XML Builders — must match vedur.ts parsing (xml2js with explicitArray: false)
// ---------------------------------------------------------------------------

interface ObsFixture {
  stationId: string
  name: string
  timestamp: string
  temp: number | null
  windSpeed: number | null
  windDir: string | null
  precipitation: number | null
}

interface ForecastFixture {
  stationId: string
  forecastTime: string
  validTime: string
  cloudCover: number | null
  temp: number | null
  precipitation: number | null
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function optionalTag(tag: string, value: number | string | null | undefined): string {
  if (value === null || value === undefined) return ''
  return `<${tag}>${escapeXml(String(value))}</${tag}>`
}

/**
 * Build observations XML that matches vedur.ts parsing:
 *   parsed.observations.station[].{ $.id, name, time, T, F, D, R }
 */
export function buildObservationsXml(observations: ObsFixture[]): string {
  const stationXmls = observations.map((obs) => {
    return [
      `<station id="${obs.stationId}" valid="1">`,
      `<name>${escapeXml(obs.name)}</name>`,
      `<time>${obs.timestamp}</time>`,
      optionalTag('T', obs.temp),
      optionalTag('F', obs.windSpeed),
      optionalTag('D', obs.windDir),
      optionalTag('R', obs.precipitation),
      `</station>`,
    ].join('')
  })

  return `<?xml version="1.0" encoding="utf-8"?><observations>${stationXmls.join('')}</observations>`
}

/**
 * Build forecasts XML that matches vedur.ts parsing:
 *   parsed.forecasts.station[].{ $.id, atime, forecast[].{ ftime, N, T, R } }
 */
export function buildForecastsXml(forecasts: ForecastFixture[]): string {
  // Group forecasts by stationId
  const grouped = new Map<string, ForecastFixture[]>()
  for (const fc of forecasts) {
    const existing = grouped.get(fc.stationId) || []
    existing.push(fc)
    grouped.set(fc.stationId, existing)
  }

  const stationXmls: string[] = []
  for (const [stationId, stationForecasts] of grouped) {
    const forecastTime = stationForecasts[0].forecastTime

    const forecastXmls = stationForecasts.map((fc) => {
      return [
        `<forecast>`,
        `<ftime>${fc.validTime}</ftime>`,
        optionalTag('N', fc.cloudCover),
        optionalTag('T', fc.temp),
        optionalTag('R', fc.precipitation),
        `</forecast>`,
      ].join('')
    })

    stationXmls.push(
      `<station id="${stationId}" valid="1">` +
      `<atime>${forecastTime}</atime>` +
      forecastXmls.join('') +
      `</station>`,
    )
  }

  return `<?xml version="1.0" encoding="utf-8"?><forecasts>${stationXmls.join('')}</forecasts>`
}

// ---------------------------------------------------------------------------
// vedur.is handlers — return XML
// ---------------------------------------------------------------------------

export const vedurHandlers = [
  http.get('https://xmlweather.vedur.is/', ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')

    if (type === 'obs') {
      return HttpResponse.xml(buildObservationsXml(weatherObs as ObsFixture[]))
    }
    if (type === 'forec') {
      return HttpResponse.xml(buildForecastsXml(weatherForecasts as ForecastFixture[]))
    }

    return new HttpResponse(null, { status: 400 })
  }),
]

// ---------------------------------------------------------------------------
// Supabase PostgREST handlers
// ---------------------------------------------------------------------------

export const supabaseHandlers = [
  http.get('*/rest/v1/viewing_spots*', () => {
    return HttpResponse.json(viewingSpots)
  }),
  http.get('*/rest/v1/weather_stations*', () => {
    return HttpResponse.json([])
  }),
  http.get('*/rest/v1/weather_forecasts*', () => {
    return HttpResponse.json([])
  }),
  http.get('*/rest/v1/pro_purchases*', () => {
    return HttpResponse.json([])
  }),
  http.post('*/rest/v1/*', () => {
    return HttpResponse.json({}, { status: 201 })
  }),
  http.patch('*/rest/v1/*', () => {
    return HttpResponse.json({})
  }),
]

// ---------------------------------------------------------------------------
// Stripe handlers
// ---------------------------------------------------------------------------

export const stripeHandlers = [
  http.post('https://api.stripe.com/v1/checkout/sessions', () => {
    return HttpResponse.json({
      id: 'cs_test_mock',
      url: 'https://checkout.stripe.com/mock',
    })
  }),
]

// ---------------------------------------------------------------------------
// Resend handlers
// ---------------------------------------------------------------------------

export const resendHandlers = [
  http.post('https://api.resend.com/emails', () => {
    return HttpResponse.json({ id: 'email_mock_id' })
  }),
]

// ---------------------------------------------------------------------------
// Vegagerðin handlers
// ---------------------------------------------------------------------------

export const vegagerdinHandlers = [
  http.get('https://gagnaveita.vegagerdin.is/api/faerdpunktar2017_1', () => {
    return HttpResponse.json(roadConditions)
  }),
  http.get('https://gagnaveita.vegagerdin.is/api/faerd2017_1', () => {
    return HttpResponse.json(roadConditions)
  }),
]

// ---------------------------------------------------------------------------
// Mapbox handlers — 1x1 transparent PNG tile
// ---------------------------------------------------------------------------

// Minimal 1x1 transparent PNG (67 bytes)
const TRANSPARENT_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, // RGBA, 8-bit
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02, // compressed data
  0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, // ...
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, // IEND chunk
  0x60, 0x82,
])

export const mapboxHandlers = [
  http.get('https://api.mapbox.com/*', () => {
    return new HttpResponse(TRANSPARENT_PNG, {
      headers: { 'Content-Type': 'image/png' },
    })
  }),
]

// ---------------------------------------------------------------------------
// Combined default handlers
// ---------------------------------------------------------------------------

export const handlers = [
  ...vedurHandlers,
  ...supabaseHandlers,
  ...stripeHandlers,
  ...resendHandlers,
  ...vegagerdinHandlers,
  ...mapboxHandlers,
]
