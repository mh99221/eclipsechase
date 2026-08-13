import { expect, test } from './fixtures'

/**
 * RETIRED 2026-08-13. Eclipse Pro is no longer for sale.
 *
 * The old cases exercised the /pro pricing card, the waiver checkbox and
 * the checkout button. All of that is gone; what remains worth pinning is
 * the retirement contract itself, so a future change can't silently
 * resurrect a payment surface on an archived site:
 *
 *   - POST /api/stripe/checkout → 410 Gone
 *   - /pro and /pro/success     → permanent redirect to /farewell
 *
 * The redirect assertions check the permanent status and the final URL
 * rather than a single Location header, because the preview server and
 * Vercel differ on whether a trailing-slash hop sits in the chain.
 *
 * The browser-level "/pro lands on /farewell" navigation is covered in
 * map.test.ts alongside the other retired-route checks.
 */
test.describe('Stripe checkout (retired)', () => {
  test('POST /api/stripe/checkout returns 410 Gone', async ({ request }) => {
    const response = await request.post('/api/stripe/checkout', {
      data: { waiver: true },
      failOnStatusCode: false,
    })
    expect(response.status()).toBe(410)
  })

  test('/pro never answers 200 and lands on the farewell page', async ({ request }) => {
    const noFollow = await request.get('/pro', { maxRedirects: 0, failOnStatusCode: false })
    expect([301, 308]).toContain(noFollow.status())

    const followed = await request.get('/pro', { failOnStatusCode: false })
    expect(followed.url()).toContain('/farewell')
  })

  test('/pro/success never answers 200 and lands on the farewell page', async ({ request }) => {
    const noFollow = await request.get('/pro/success', { maxRedirects: 0, failOnStatusCode: false })
    expect([301, 308]).toContain(noFollow.status())

    const followed = await request.get('/pro/success', { failOnStatusCode: false })
    expect(followed.url()).toContain('/farewell')
  })
})
