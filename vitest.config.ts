import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

const i18nStub = fileURLToPath(new URL('./tests/mocks/nuxt-i18n-composables.ts', import.meta.url))

// Vite resolves Nuxt's @nuxtjs/i18n auto-imports via a relative path
// (`../node_modules/@nuxtjs/i18n/dist/runtime/composables/index`),
// so a plain alias entry doesn't match. Intercept at the resolveId
// stage instead — runs before Vite's default resolution and catches
// any spelling that ends in the composables-index path.
const stubNuxtI18nComposables = {
  name: 'stub-nuxt-i18n-composables',
  enforce: 'pre' as const,
  resolveId(source: string) {
    if (/@nuxtjs[\\/]i18n[\\/]dist[\\/]runtime[\\/]composables[\\/]index(\.js)?$/.test(source)) {
      return i18nStub
    }
    return null
  },
}

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    environmentMatchGlobs: [
      // Unit tests use plain happy-dom (no Nuxt boot) for speed
      ['tests/unit/**', 'happy-dom'],
      // Server tests use node
      ['tests/server/**', 'node'],
    ],
    // @nuxt/test-utils/runtime/entry.mjs registers a beforeAll that
    // calls setupNuxt() with no explicit timeout. Vitest's 10 s
    // default is not enough for the first cold boot on Windows
    // (transform pass alone takes 60 s+ here). Bump both hook + test
    // timeouts so happy-dom suites that still pull in the entry boot
    // don't fail on the cold path.
    hookTimeout: 120_000,
    testTimeout: 30_000,
    setupFiles: ['./tests/mocks/setup.ts', './tests/server/api/_setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.claude/**', '.nuxt/**', '.output/**'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.ts', 'app/**/*.vue', 'server/**/*.ts'],
      exclude: ['app/types/**', '**/*.d.ts'],
      thresholds: {
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      'mapbox-gl': fileURLToPath(new URL('./tests/mocks/mapbox-gl.ts', import.meta.url)),
      '#supabase/server': fileURLToPath(new URL('./tests/mocks/supabase-server.ts', import.meta.url)),
    },
  },
  plugins: [stubNuxtI18nComposables],
})
