import { expect, test } from './fixtures'

test.describe('Spots listing page', () => {
  // The page chrome (eyebrow header, profile pills, sort tabs, region chips)
  // renders regardless of API state. Spot cards only appear when /api/spots
  // returns data — which requires SUPABASE_SECRET_KEY, not set in CI — so
  // we don't assert on card content here.

  test('page loads with header chrome', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    // useHead sets the document title.
    await expect(page).toHaveTitle(/Viewing Spots/)

    // The "● SPOTS · N" eyebrow always renders (N may be 0 in CI).
    const eyebrow = page.locator('.eyebrow', { hasText: /SPOTS/ }).first()
    await expect(eyebrow).toBeVisible()
  })

  test('profile selector renders the All + 5 profile pills', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    // Profile picker is always visible for all users (clicking a profile
    // triggers an upgrade prompt for non-Pro, but the pills themselves
    // are public — they're a teaser).
    const labels = ['All', 'Photographer', 'Family', 'Hiker', 'Sky Chaser', 'First-Timer']
    for (const label of labels) {
      await expect(
        page.getByRole('button', { name: label, exact: true }),
      ).toBeVisible()
    }
  })
})
