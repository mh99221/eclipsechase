import { expect, test } from './fixtures'

test.describe('Stripe checkout / Pro page', () => {
  test('/pro page displays pricing at 9.99', async ({ page, goto }) => {
    await goto('/pro', { waitUntil: 'hydration' })

    // Price card shows €9.99
    const price = page.getByText('9.99')
    await expect(price.first()).toBeVisible()
  })

  test('/pro page lists feature benefits', async ({ page, goto }) => {
    await goto('/pro', { waitUntil: 'hydration' })

    // Feature cards (check for checkmark SVG icons)
    const featureCards = page.locator('.bg-void-surface')
    const count = await featureCards.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('/pro page has waiver checkbox and checkout button', async ({ page, goto }) => {
    await goto('/pro', { waitUntil: 'hydration' })

    // Waiver checkbox
    const checkbox = page.locator('input[type="checkbox"]')
    await expect(checkbox).toBeVisible()

    // Checkout button
    const checkoutButton = page.locator('button').filter({ hasText: /checkout|get|pro|pay/i })
    await expect(checkoutButton.first()).toBeVisible()
  })

  test('/pro/success page handles missing session_id', async ({ page, goto }) => {
    await goto('/pro/success', { waitUntil: 'hydration' })

    // Without session_id, should show delayed/fallback state
    // Page should still render (not crash)
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })
})
