/**
 * Custom E2E test fixtures.
 *
 * Re-exports @nuxt/test-utils/playwright with the fixture timeout patched
 * in a postinstall script (see scripts/patch-e2e-timeout.js).
 *
 * The default FIXTURE_TIMEOUT in @nuxt/test-utils is 120s on Windows,
 * which is insufficient for this project's production build (~110s).
 * The patch increases it to 360s.
 */
export { test, expect } from '@nuxt/test-utils/playwright'
