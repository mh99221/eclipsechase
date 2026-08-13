import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../api/_helpers'

const { default: handler } = await import('../../../server/middleware/retired-routes')

function eventFor(path: string) {
  const event = createTestEvent({})
  Object.defineProperty(event, 'path', { value: path, configurable: true })
  return event
}

describe('retired-routes middleware', () => {
  describe('410s the retired Pro app surfaces', () => {
    for (const path of ['/map', '/map/', '/dashboard', '/api/cameras', '/api/traffic/conditions', '/api/horizon/check']) {
      it(`410s ${path}`, () => {
        expect(() => handler(eventFor(path))).toThrowError(
          expect.objectContaining({ statusCode: 410 }),
        )
      })
    }
  })

  describe('410s the locale-prefixed variant too', () => {
    // Regression coverage: @nuxtjs/i18n's prefix_except_default strategy
    // does not localize this middleware automatically. /is/map previously
    // fell through to a live 200 because the retired-prefix check only
    // ever saw the unprefixed path.
    for (const path of ['/is/map', '/is/map/', '/is/dashboard']) {
      it(`410s ${path}`, () => {
        expect(() => handler(eventFor(path))).toThrowError(
          expect.objectContaining({ statusCode: 410 }),
        )
      })
    }
  })

  describe('redirects /pro and /pro/success to /farewell', () => {
    it('redirects /pro with a 301', () => {
      const event = eventFor('/pro')
      handler(event)
      expect(event.node.res.statusCode).toBe(301)
      expect(event.node.res.getHeader('location')).toBe('/farewell')
    })

    it('redirects /pro/success with a 301', () => {
      const event = eventFor('/pro/success')
      handler(event)
      expect(event.node.res.statusCode).toBe(301)
      expect(event.node.res.getHeader('location')).toBe('/farewell')
    })

    // Regression coverage: this used to be a nuxt.config.ts routeRules
    // redirect, which — same as the 410 case above — is not localized.
    // /is/pro served the full live purchase page (price, Stripe copy)
    // instead of redirecting.
    it('redirects the locale-prefixed /is/pro to /is/farewell', () => {
      const event = eventFor('/is/pro')
      handler(event)
      expect(event.node.res.statusCode).toBe(301)
      expect(event.node.res.getHeader('location')).toBe('/is/farewell')
    })

    it('redirects the locale-prefixed /is/pro/success to /is/farewell', () => {
      const event = eventFor('/is/pro/success')
      handler(event)
      expect(event.node.res.statusCode).toBe(301)
      expect(event.node.res.getHeader('location')).toBe('/is/farewell')
    })
  })

  describe('leaves surviving pages alone', () => {
    // /check and /api/check are public, static-data-only, and survive the
    // sunset. /is/* variants of surviving pages must not be caught by the
    // locale-prefix stripping either.
    for (const path of [
      '/', '/spots', '/spots/some-spot', '/guide', '/check', '/api/check', '/api/spots', '/farewell',
      '/is', '/is/spots', '/is/guide', '/is/check', '/is/farewell',
    ]) {
      it(`allows ${path}`, () => {
        expect(() => handler(eventFor(path))).not.toThrow()
        const event = eventFor(path)
        handler(event)
        expect(event.node.res.statusCode).not.toBe(301)
      })
    }
  })
})
