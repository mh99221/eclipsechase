import { expect, test } from './fixtures'

test.describe('Spots listing page', () => {
  // Note: Page renders the static title and profile selector regardless of
  // API state. Spot cards only appear when /api/spots returns data, which
  // requires SUPABASE_SECRET_KEY (not set in CI). Skip data-dependent
  // assertions here.

  test('spots page loads with title', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toHaveText('Viewing Spots')
  })

  test('profile selector renders for all users', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    // 5 profile buttons should always render (locked for free users)
    const photographerBtn = page.locator('button', { hasText: 'Photographer' })
    await expect(photographerBtn).toBeVisible()
  })
})
