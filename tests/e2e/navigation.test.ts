import { expect, test } from './fixtures'

test.describe('Navigation', () => {
  test('logo links to home from guide page', async ({ page, goto }) => {
    await goto('/guide', { waitUntil: 'hydration' })

    const logoLink = page.locator('nav a[href="/"]').first()
    await expect(logoLink).toBeVisible()

    await logoLink.click()
    await page.waitForURL('/', { timeout: 15000 })

    // Should be on home page with h1
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
  })

  test('logo links to home from privacy page', async ({ page, goto }) => {
    await goto('/privacy', { waitUntil: 'hydration' })

    const logoLink = page.locator('nav a[href="/"]').first()
    await expect(logoLink).toBeVisible()

    await logoLink.click()
    await page.waitForURL('/', { timeout: 15000 })
  })

  test('privacy and terms links exist in guide footer', async ({ page, goto }) => {
    await goto('/guide', { waitUntil: 'hydration' })

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    // Privacy link exists in footer
    const privacyLink = footer.locator('a[href="/privacy"]')
    await expect(privacyLink).toBeVisible()

    // Terms link exists in footer
    const termsLink = footer.locator('a[href="/terms"]')
    await expect(termsLink).toBeVisible()
  })
})
