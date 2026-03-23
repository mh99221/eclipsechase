import { expect, test } from './fixtures'

test.describe('Offline behavior', () => {
  test('page renders initially while online', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Page should be visible and functional
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
  })

  test('page does not crash when going offline', async ({ page, goto, context }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Verify page is loaded
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // Go offline
    await context.setOffline(true)

    // Wait briefly for offline detection
    await page.waitForTimeout(1000)

    // Restore online state
    await context.setOffline(false)

    // Page should still be functional
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })
})
