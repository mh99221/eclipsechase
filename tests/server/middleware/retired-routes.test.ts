import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../api/_helpers'

const { default: handler } = await import('../../../server/middleware/retired-routes')

function eventFor(path: string) {
  const event = createTestEvent({})
  Object.defineProperty(event, 'path', { value: path, configurable: true })
  return event
}

describe('retired-routes middleware', () => {
  for (const path of ['/map', '/map/', '/dashboard', '/api/cameras', '/api/traffic/conditions', '/api/horizon/check']) {
    it(`410s ${path}`, () => {
      expect(() => handler(eventFor(path))).toThrowError(
        expect.objectContaining({ statusCode: 410 }),
      )
    })
  }

  // /check and /api/check are public, static-data-only, and survive the sunset.
  for (const path of ['/', '/spots', '/spots/some-spot', '/guide', '/check', '/api/check', '/api/spots', '/farewell']) {
    it(`allows ${path}`, () => {
      expect(() => handler(eventFor(path))).not.toThrow()
    })
  }
})
