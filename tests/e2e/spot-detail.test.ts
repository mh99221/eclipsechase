import { expect, test } from './fixtures'

test.describe('Spot detail page', () => {
  // Note: In the test environment, the Supabase URL points to localhost:54321
  // which is not running. The spot API will fail, resulting in error pages.
  // These tests verify error handling behavior.

  test('unknown slug shows error page', async ({ page, goto }) => {
    await goto('/spots/nonexistent-spot-xyz', { waitUntil: 'hydration' })

    // Should show error or 404 content
    const errorContent = page.locator('text=/404|not found|error/i')
    await expect(errorContent.first()).toBeVisible({ timeout: 10000 })
  })

  test('spot page handles missing API data gracefully', async ({ page, goto }) => {
    // Even with a valid slug, the API is not available in test env
    // The page should show an error rather than crash
    await goto('/spots/stykkisholmur-harbour', { waitUntil: 'hydration' })

    // Either shows the spot (if data cached) or an error page
    const content = page.locator('h1, [class*="error"]')
    await expect(content.first()).toBeVisible({ timeout: 10000 })
  })
})
