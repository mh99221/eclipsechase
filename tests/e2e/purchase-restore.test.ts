import { expect, test } from './fixtures'

test.describe('Purchase restoration', () => {
  test('/pro page has restore purchase option', async ({ page, goto }) => {
    await goto('/pro', { waitUntil: 'hydration' })

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)

    // RestorePurchase component should have a trigger button/link
    const restoreLink = page.getByText(/restore|already purchased/i)
    await expect(restoreLink.first()).toBeVisible()
  })

  test('clicking restore shows email input', async ({ page, goto }) => {
    await goto('/pro', { waitUntil: 'hydration' })

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)

    // Click the restore trigger
    const restoreLink = page.getByText(/restore|already purchased/i).first()
    await restoreLink.click()

    // Email input should appear
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })
  })
})
