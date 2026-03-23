import { expect, test } from './fixtures'

test.describe('Landing page', () => {
  test('renders hero section with headline and countdown', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Main headline visible
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // Eclipse hero SVG renders (the corona circle)
    const eclipseHeroSvg = page.locator('header svg').first()
    await expect(eclipseHeroSvg).toBeVisible()

    // Countdown section exists
    const countdownSection = page.getByText('ECLIPSECHASE')
    await expect(countdownSection.first()).toBeVisible()
  })

  test('displays eclipse data strip with statistics', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Data strip section is present
    const dataStrip = page.locator('section[aria-label="Eclipse statistics"]')
    await expect(dataStrip).toBeVisible()
  })

  test('renders feature sections', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // At least one feature item visible (numbered 01-04)
    const featureNumbers = page.locator('text=01')
    await expect(featureNumbers.first()).toBeVisible()
  })

  test('email signup section is present', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Scroll to bottom where signup is
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Email input should exist
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
  })

  test('footer contains privacy and terms links', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()

    // Privacy and terms links
    const privacyLink = footer.locator('a[href="/privacy"]')
    await expect(privacyLink).toBeVisible()

    const termsLink = footer.locator('a[href="/terms"]')
    await expect(termsLink).toBeVisible()
  })
})
