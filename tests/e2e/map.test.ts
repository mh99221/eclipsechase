import { expect, test } from './fixtures'

test.describe('Map page', () => {
  // In production builds, the pro-gate middleware redirects to /pro.
  // These tests verify the gate behavior for the map page.

  test('non-Pro user is redirected to /pro', async ({ page, goto }) => {
    await goto('/map', { waitUntil: 'hydration' })

    // Pro-gate redirects to /pro since user has no JWT
    await expect(page).toHaveURL(/\/pro/)
  })

  test('/pro page shows upgrade prompt with map feature', async ({ page, goto }) => {
    await goto('/map', { waitUntil: 'hydration' })

    // After redirect to /pro, the page shows pricing
    await expect(page).toHaveURL(/\/pro/)

    const price = page.getByText('9.99')
    await expect(price.first()).toBeVisible()
  })
})
