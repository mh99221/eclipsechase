import { expect, test } from './fixtures'

test.describe('Landing page', () => {
  test('renders hero section with countdown and brand mark', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Hero section is present
    const hero = page.locator('section[aria-label="Eclipse countdown"]')
    await expect(hero).toBeVisible()

    // Eclipse hero SVG renders inside the hero
    const eclipseHeroSvg = hero.locator('svg').first()
    await expect(eclipseHeroSvg).toBeVisible()

    // Brand wordmark visible (BrandBar)
    const brand = page.getByText('ECLIPSECHASE')
    await expect(brand.first()).toBeVisible()
  })

  test('displays utility tile grid', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })

    // Tile grid section is present
    const tilesSection = page.locator('section[aria-label="Quick links"]')
    await expect(tilesSection).toBeVisible()

    // At least three tiles render
    const tiles = page.locator('[data-testid="home-tile"]')
    await expect(tiles.first()).toBeVisible()
    expect(await tiles.count()).toBeGreaterThanOrEqual(3)
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
