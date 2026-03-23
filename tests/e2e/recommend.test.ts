import { expect, test } from './fixtures'

test.describe('Recommend page', () => {
  // In production builds, the pro-gate middleware redirects to /pro.

  test('non-Pro user is redirected to /pro', async ({ page, goto }) => {
    await goto('/recommend', { waitUntil: 'hydration' })

    await expect(page).toHaveURL(/\/pro/)
  })

  test('/pro page is shown with features list after redirect', async ({ page, goto }) => {
    await goto('/recommend', { waitUntil: 'hydration' })

    // After redirect, /pro page shows features
    await expect(page).toHaveURL(/\/pro/)

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
  })
})
